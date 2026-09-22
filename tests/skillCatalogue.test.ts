import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { normalizeSkillName } from "../lib/skill-normalization";
import {
  applySkillCatalogue,
  parseImportArguments,
  readCatalogue,
  type CatalogueDb,
} from "../scripts/import-skill-catalogue";
import { bootstrapSkills, parseBootstrapArguments } from "../scripts/bootstrap-skills";
import {
  CATALOGUE_PATH,
  DEVICON_PATH,
  CURATED_SKILLS_PATH,
  TECHNOLOGY_PATH,
} from "../scripts/prepare-skill-catalogue";
import {
  prepareCatalogue,
  prepareCatalogueFiles,
  type PreparedSkill,
} from "../scripts/lib/skill-catalogue";

test("shared normalization handles punctuation and required friendly spellings", () => {
  for (const group of [
    ["Node.js", "nodejs"],
    ["AWS", "Amazon Web Services (AWS)"],
    ["C Sharp", "C#"],
    ["C Plus Plus", "C++"],
    ["PostgreSQL", "postgres"],
    ["MongoDB", "mongodb"],
    ["React.js", "React"],
    ["Vue.js", "Vue"],
    ["Next.js", "NextJS"],
    [".NET", "dotnet"],
  ]) {
    assert.equal(normalizeSkillName(group[0]), normalizeSkillName(group[1]), group.join(" / "));
  }
  assert.equal(normalizeSkillName("  Foo—Bar\t Baz! "), "foobar baz");
});

test("preparation reads only the five selected worked-with datasets", () => {
  const technology = {
    Language: { datasets: { Language: { data: [{ response: "React.js", frequency: 10, percent: 0.5 }] }, Language_prof: { data: [{ response: "Ignored prof", frequency: 99, percent: 0.9 }] } } },
    Database: { datasets: { Database: { data: [{ response: "PostgreSQL", frequency: 8, percent: 0.4 }] } } },
    Platform: { datasets: { Platform: { data: [{ response: "AWS", frequency: 7, percent: 0.3 }] } } },
    Webframe: { datasets: { Webframe: { data: [{ response: "React", frequency: 6, percent: 0.2 }] } } },
    DevEnvs: { datasets: { DevEnvs: { data: [{ response: "VS Code", frequency: 5, percent: 0.1 }] } } },
    SOTags: { datasets: { SOTags: { data: [{ response: "Ignored", frequency: 100, percent: 1 }] } } },
  };
  const result = prepareCatalogue(technology, [
    { name: "react", altnames: ["reactjs"], tags: ["framework", "library", "ui"] },
  ]);
  assert.equal(result.length, 4);
  const react = result.find((row) => row.normalizedName === "react");
  assert.deepEqual(react?.categories, ["LANGUAGE", "FRAMEWORK"]);
  assert.equal(react?.frequency, 10);
  assert.equal(react?.popularity, 0.5);
  assert.equal(react?.iconKey, "react");
  assert.ok(react?.name === "React.js" || react?.aliases.includes("React.js"));
  assert.ok(react?.name === "React" || react?.aliases.includes("React"));
  assert.ok(!react?.aliases.includes("framework"));
  assert.ok(!react?.aliases.includes("library"));
  assert.ok(react?.aliases.includes("ui"));
  assert.ok(!result.some((row) => row.name.startsWith("Ignored")));
});

function memoryDb(initial: Array<PreparedSkill & { id: string }> = []) {
  const rows = structuredClone(initial);
  let nextId = rows.length + 1;
  let writes = 0;
  let junctionDeletes = 0;
  const db: CatalogueDb = {
    skill: {
      async findMany() { return structuredClone(rows); },
      async upsert({ where, create, update }) {
        writes++;
        const row = rows.find((item) => item.normalizedName === where.normalizedName);
        if (row) {
          Object.assign(row, structuredClone(update));
          return row;
        }
        const inserted = { id: String(nextId++), ...structuredClone(create) };
        rows.push(inserted);
        return inserted;
      },
    },
  };
  Object.assign(db, {
    userSkill: { deleteMany: async () => { junctionDeletes++; } },
    jobSkill: { deleteMany: async () => { junctionDeletes++; } },
  });
  return { db, rows, writes: () => writes, junctionDeletes: () => junctionDeletes };
}

const prepared = (name: string, popularity = 0.5): PreparedSkill => ({
  name,
  normalizedName: normalizeSkillName(name),
  aliases: [],
  normalizedAliases: [],
  categories: ["LANGUAGE"],
  popularity,
  frequency: 10,
  iconKey: null,
  sources: ["STACK_OVERFLOW"],
  active: true,
});

test("import planning is idempotent, preserves IDs, and never removes unrelated records", async () => {
  const react = { id: "existing", ...prepared("React", 0.1) };
  const stale = { id: "stale", ...prepared("Old skill") };
  const memory = memoryDb([react, stale]);
  const catalogue = [prepared("React", 0.8), prepared("TypeScript", 0.7)];

  const dry = await applySkillCatalogue(memory.db, catalogue);
  assert.deepEqual(dry, { read: 2, inserted: 1, updated: 1, unchanged: 0, failed: 0 });
  assert.equal(memory.writes(), 0);

  assert.deepEqual(await applySkillCatalogue(memory.db, catalogue, { write: true }), dry);
  assert.equal(memory.rows.find((row) => row.normalizedName === "react")?.id, "existing");
  assert.equal(memory.rows.find((row) => row.id === "stale")?.active, true);
  assert.equal(memory.junctionDeletes(), 0);
  assert.deepEqual(await applySkillCatalogue(memory.db, catalogue), {
    read: 2, inserted: 0, updated: 0, unchanged: 2, failed: 0,
  });

  const duplicate = memoryDb([
    { id: "one", ...prepared("React") },
    { id: "two", ...prepared("React") },
  ]);
  await assert.rejects(applySkillCatalogue(duplicate.db, catalogue), /duplicate normalized names/);
  assert.equal(duplicate.writes(), 0);
  const failing = memoryDb();
  failing.db.skill.upsert = async () => { throw new Error("injected write failure"); };
  await assert.rejects(
    applySkillCatalogue(failing.db, [prepared("React")], { write: true }),
    /injected write failure/,
  );
  assert.deepEqual(parseBootstrapArguments([]), { write: false });
  assert.deepEqual(parseBootstrapArguments(["--write"]), { write: true });
  assert.throws(() => parseBootstrapArguments(["--force"]), /only supported flag/);
});

test("actual source files produce the committed, validated catalogue", async () => {
  const generated = await prepareCatalogueFiles(TECHNOLOGY_PATH, DEVICON_PATH, CURATED_SKILLS_PATH);
  const regenerated = await prepareCatalogueFiles(TECHNOLOGY_PATH, DEVICON_PATH, CURATED_SKILLS_PATH);
  const committed = await readCatalogue(CATALOGUE_PATH);
  assert.deepEqual(committed, generated);
  assert.deepEqual(regenerated, generated);
  const curated = generated.filter((row) => row.sources.includes("CURATED"));
  const technologies = generated.filter((row) => row.sources.includes("STACK_OVERFLOW"));
  assert.ok(curated.length >= 100 && curated.length <= 150);
  assert.equal(technologies.length, 168);
  assert.equal(new Set(generated.map((row) => row.normalizedName)).size, generated.length);
  for (const category of [
    "SOFT_SKILL", "BUSINESS", "MANAGEMENT", "MARKETING", "DESIGN", "DATA",
    "FINANCE", "SALES", "HUMAN_RESOURCES", "OPERATIONS", "WRITING_MEDIA", "RESEARCH",
  ] as const) {
    assert.ok(curated.some((row) => row.categories.includes(category)), category);
  }
  const aliases = new Map<string, string>();
  for (const skill of generated) for (const alias of skill.normalizedAliases) {
    assert.ok(!aliases.has(alias) || aliases.get(alias) === skill.normalizedName, `alias collision: ${alias}`);
    assert.ok(!generated.some((other) => other.normalizedName === alias && other.normalizedName !== skill.normalizedName), `alias/name collision: ${alias}`);
    aliases.set(alias, skill.normalizedName);
  }
  assert.equal(aliases.get("seo"), "search engine optimization");
  assert.equal(aliases.get("sem"), "search engine marketing");
  assert.equal(aliases.get("crm"), "customer relationship management");
  assert.equal(aliases.get("ui"), "ui design");
  assert.equal(aliases.get("ux"), "ux design");
  const source = JSON.parse(readFileSync(TECHNOLOGY_PATH, "utf8"));
  assert.ok(source.SOTags && source.WW_Language && source.DA_Language);
  assert.equal(parseImportArguments(["--dry-run"]).dryRun, true);
  assert.throws(() => parseImportArguments(["--force"]));
});

test("bootstrap plans an empty database, writes only when requested, and reruns idempotently", async () => {
  const memory = memoryDb();
  const planned = await bootstrapSkills({ db: memory.db });
  assert.equal(planned.mode, "dry-run");
  assert.deepEqual(planned.imported, {
    read: 300, inserted: 300, updated: 0, unchanged: 0, failed: 0,
  });
  assert.equal(memory.writes(), 0);

  const applied = await bootstrapSkills({ write: true, db: memory.db });
  assert.equal(applied.mode, "write");
  assert.deepEqual(applied.imported, planned.imported);
  assert.equal(memory.rows.length, 300);

  const rerun = await bootstrapSkills({ db: memory.db });
  assert.deepEqual(rerun.imported, {
    read: 300, inserted: 0, updated: 0, unchanged: 300, failed: 0,
  });
});

test("missing and malformed source files fail clearly", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "skill-bootstrap-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const missing = join(directory, "missing.json");
  await assert.rejects(
    prepareCatalogueFiles(missing, DEVICON_PATH, CURATED_SKILLS_PATH),
    /ENOENT|no such file/i,
  );
  const malformed = join(directory, "malformed.json");
  writeFileSync(malformed, "not json");
  await assert.rejects(
    prepareCatalogueFiles(TECHNOLOGY_PATH, DEVICON_PATH, malformed),
    /curated-skills\.json is not valid JSON/,
  );
});
