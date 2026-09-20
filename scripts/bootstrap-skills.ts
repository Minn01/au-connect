import { pathToFileURL } from "node:url";

import {
  importSkillCatalogue,
  readCatalogue,
  type CatalogueDb,
} from "./import-skill-catalogue";
import {
  CATALOGUE_PATH,
  prepareSkillCatalogue,
} from "./prepare-skill-catalogue";
import { SKILL_CATEGORIES } from "./lib/skill-catalogue";
import { SkillInputError, client, safeError } from "./lib/skill-tools";

export function parseBootstrapArguments(args = process.argv.slice(2)) {
  if (args.length === 0) return { write: false as const };
  if (args.length === 1 && args[0] === "--write")
    return { write: true as const };
  throw new SkillInputError(
    "Bootstrap is dry-run by default; the only supported flag is --write.",
  );
}

export function catalogueCounts(
  catalogue: Awaited<ReturnType<typeof readCatalogue>>,
) {
  const categories = Object.fromEntries(
    SKILL_CATEGORIES.map((category) => [category, 0]),
  );
  for (const skill of catalogue)
    for (const category of skill.categories) categories[category]++;
  return {
    total: catalogue.length,
    technologies: catalogue.filter((skill) =>
      skill.sources.includes("STACK_OVERFLOW"),
    ).length,
    curated: catalogue.filter((skill) => skill.sources.includes("CURATED"))
      .length,
    deviconEnriched: catalogue.filter((skill) =>
      skill.sources.includes("DEVICON"),
    ).length,
    categories,
  };
}

export async function bootstrapSkills({
  write = false,
  db,
}: {
  write?: boolean;
  db?: CatalogueDb;
} = {}) {
  await prepareSkillCatalogue();
  const catalogue = await readCatalogue(CATALOGUE_PATH);
  const counts = catalogueCounts(catalogue);
  const ownedClient = db ? undefined : client();
  try {
    const imported = await importSkillCatalogue({
      write,
      db: (db ?? ownedClient) as CatalogueDb,
      catalogue,
    });
    return {
      mode: write ? ("write" as const) : ("dry-run" as const),
      counts,
      imported,
    };
  } finally {
    await ownedClient?.$disconnect();
  }
}

async function main() {
  const options = parseBootstrapArguments();
  if (options.write) {
    console.info(
      "WRITE MODE: confirm DATABASE_URL targets the intended database.",
    );
  } else {
    console.info("DRY RUN: no database records will be written.");
  }
  console.info(JSON.stringify(await bootstrapSkills(options), null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  });
}
