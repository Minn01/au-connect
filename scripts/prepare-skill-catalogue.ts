import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { prepareCatalogueFiles } from "./lib/skill-catalogue";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const TECHNOLOGY_PATH = resolve(ROOT, "data/skills/source/technology.json");
export const DEVICON_PATH = resolve(ROOT, "data/skills/source/devicon.json");
export const CURATED_SKILLS_PATH = resolve(ROOT, "data/skills/source/curated-skills.json");
export const CATALOGUE_PATH = resolve(ROOT, "data/skills/catalogue.json");

export async function prepareSkillCatalogue({
  technologyPath = TECHNOLOGY_PATH,
  deviconPath = DEVICON_PATH,
  curatedPath = CURATED_SKILLS_PATH,
  outputPath = CATALOGUE_PATH,
  check = false,
} = {}) {
  const catalogue = await prepareCatalogueFiles(technologyPath, deviconPath, curatedPath);
  const contents = `${JSON.stringify(catalogue, null, 2)}\n`;
  if (check) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== contents) throw new Error("Prepared catalogue is stale. Run pnpm skills:prepare.");
  } else {
    await mkdir(dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp-${process.pid}`;
    await writeFile(temporaryPath, contents);
    await rename(temporaryPath, outputPath);
  }
  return catalogue;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--check")) throw new Error("Only --check is supported.");
  const catalogue = await prepareSkillCatalogue({ check: args.includes("--check") });
  console.info(`${args.includes("--check") ? "Verified" : "Prepared"} ${catalogue.length} skills.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Catalogue preparation failed.");
    process.exitCode = 1;
  });
}
