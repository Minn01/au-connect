import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { cleanSkillLabel, normalizeSkillName } from "../lib/skill-normalization";
import { CATALOGUE_PATH } from "./prepare-skill-catalogue";
import { SKILL_CATEGORIES, type PreparedSkill } from "./lib/skill-catalogue";
import { SkillInputError, client, safeError } from "./lib/skill-tools";

type ExistingSkill = PreparedSkill & { id: string; active: boolean };

export type CatalogueDb = {
  skill: {
    findMany(args?: unknown): Promise<ExistingSkill[]>;
    upsert(args: {
      where: { normalizedName: string };
      create: PreparedSkill;
      update: PreparedSkill;
    }): Promise<unknown>;
  };
};

export type ImportTotals = {
  read: number;
  inserted: number;
  updated: number;
  unchanged: number;
  failed: number;
};

function validateRecord(value: unknown, index: number): PreparedSkill {
  const row = value as Partial<PreparedSkill> | null;
  const fail = (reason: string): never => {
    throw new SkillInputError(`Invalid catalogue record ${index + 1}: ${reason}.`);
  };
  if (!row || typeof row.name !== "string") {
    throw new SkillInputError(`Invalid catalogue record ${index + 1}: missing name.`);
  }
  const record = row as PreparedSkill;
  if (cleanSkillLabel(record.name) !== record.name) fail("name is not clean");
  if (record.normalizedName !== normalizeSkillName(record.name)) fail("normalizedName does not match name");
  if (!Array.isArray(record.aliases) || !record.aliases.every((item) => typeof item === "string")) fail("invalid aliases");
  const expectedAliases = [...new Set(record.aliases.map(normalizeSkillName))]
    .filter((item) => item && item !== record.normalizedName)
    .sort();
  if (!Array.isArray(record.normalizedAliases) || JSON.stringify(record.normalizedAliases) !== JSON.stringify(expectedAliases)) {
    fail("normalizedAliases do not match aliases");
  }
  if (!Array.isArray(record.categories) || record.categories.length === 0 ||
      !record.categories.every((item) => SKILL_CATEGORIES.includes(item))) fail("invalid categories");
  if (record.popularity !== null &&
      (typeof record.popularity !== "number" || record.popularity < 0 || record.popularity > 1)) fail("invalid popularity");
  if (record.frequency !== null && (!Number.isInteger(record.frequency) || record.frequency < 0)) fail("invalid frequency");
  if (record.iconKey !== null && typeof record.iconKey !== "string") fail("invalid iconKey");
  if (!Array.isArray(record.sources) || record.sources.length === 0 ||
      !record.sources.every((source) => ["STACK_OVERFLOW", "DEVICON", "CURATED"].includes(source)) ||
      (!record.sources.includes("STACK_OVERFLOW") && !record.sources.includes("CURATED"))) fail("invalid sources");
  if (record.active !== true) fail("prepared skills must be active");
  return record;
}

export async function readCatalogue(path = CATALOGUE_PATH) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new SkillInputError("Prepared catalogue is missing. Run pnpm skills:prepare first.");
    }
    throw new SkillInputError("Prepared catalogue is not valid JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new SkillInputError("Prepared catalogue must be a nonempty array.");
  const catalogue = parsed.map(validateRecord);
  if (new Set(catalogue.map((row) => row.normalizedName)).size !== catalogue.length) {
    throw new SkillInputError("Prepared catalogue contains duplicate normalized names.");
  }
  return catalogue;
}

function comparable(skill: ExistingSkill | PreparedSkill) {
  const { name, normalizedName, aliases, normalizedAliases, categories, popularity,
    frequency, iconKey, sources, active } = skill;
  return { name, normalizedName, aliases, normalizedAliases, categories, popularity,
    frequency, iconKey, sources, active };
}

export async function applySkillCatalogue(
  db: CatalogueDb,
  catalogue: PreparedSkill[],
  { write = false }: { write?: boolean } = {},
): Promise<ImportTotals> {
  const existing = await db.skill.findMany();
  const byName = new Map(existing.map((skill) => [skill.normalizedName, skill]));
  if (existing.some((skill) => !skill.normalizedName) || byName.size !== existing.length) {
    throw new SkillInputError(
      "Existing skills contain blank or duplicate normalized names; reset or repair them before importing.",
    );
  }
  const totals: ImportTotals = { read: catalogue.length, inserted: 0, updated: 0, unchanged: 0, failed: 0 };

  for (const incoming of catalogue) {
    const current = byName.get(incoming.normalizedName);
    if (!current) {
      totals.inserted++;
      if (write) await db.skill.upsert({
        where: { normalizedName: incoming.normalizedName },
        create: incoming,
        update: incoming,
      });
    } else if (JSON.stringify(comparable(current)) === JSON.stringify(incoming)) {
      totals.unchanged++;
    } else {
      totals.updated++;
      if (write) await db.skill.upsert({
        where: { normalizedName: incoming.normalizedName },
        create: incoming,
        update: incoming,
      });
    }
  }
  return totals;
}

export async function importSkillCatalogue({
  write = false,
  db,
  catalogue,
  inputPath = CATALOGUE_PATH,
}: {
  write?: boolean;
  db?: CatalogueDb;
  catalogue?: PreparedSkill[];
  inputPath?: string;
} = {}) {
  const ownedClient = db ? undefined : client();
  try {
    const records = catalogue ?? await readCatalogue(inputPath);
    return await applySkillCatalogue(
      (db ?? ownedClient) as CatalogueDb,
      records,
      { write },
    );
  } finally {
    await ownedClient?.$disconnect();
  }
}

export function parseImportArguments(args = process.argv.slice(2)) {
  if (args.includes("--write") && args.includes("--dry-run")) {
    throw new SkillInputError("Choose either --write or --dry-run, not both.");
  }
  let write = false;
  let inputPath = CATALOGUE_PATH;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--dry-run") write = false;
    else if (arg === "--write") write = true;
    else if (arg === "--input" && args[index + 1]) inputPath = resolve(args[++index]);
    else throw new SkillInputError("Use only --write, --dry-run, and optional --input <path>.");
  }
  return { dryRun: !write, write, inputPath };
}

async function main() {
  const options = parseImportArguments();
  const totals = await importSkillCatalogue({
    write: options.write,
    inputPath: options.inputPath,
  });
  console.info(JSON.stringify({ dryRun: options.dryRun, ...totals }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  });
}
