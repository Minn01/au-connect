import { readFile } from "node:fs/promises";

import { cleanSkillLabel, normalizeSkillName } from "../../lib/skill-normalization";

export const SKILL_CATEGORIES = [
  "LANGUAGE",
  "DATABASE",
  "PLATFORM",
  "FRAMEWORK",
  "TOOL",
  "SOFT_SKILL",
  "BUSINESS",
  "MANAGEMENT",
  "MARKETING",
  "DESIGN",
  "DATA",
  "FINANCE",
  "SALES",
  "HUMAN_RESOURCES",
  "OPERATIONS",
  "WRITING_MEDIA",
  "RESEARCH",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export type PreparedSkill = {
  name: string;
  normalizedName: string;
  aliases: string[];
  normalizedAliases: string[];
  categories: SkillCategory[];
  popularity: number | null;
  frequency: number | null;
  iconKey: string | null;
  sources: string[];
  active: true;
};

type SurveyRow = { response: string; frequency: number; percent: number };
type TechnologyFile = Record<string, { datasets?: Record<string, { data?: SurveyRow[] }> }>;
type DeviconEntry = { name: string; altnames?: string[]; tags?: string[] };
type CuratedSkillInput = { name: string; aliases: string[]; categories: SkillCategory[] };

const SECTIONS: ReadonlyArray<[string, SkillCategory]> = [
  ["Language", "LANGUAGE"],
  ["Database", "DATABASE"],
  ["Platform", "PLATFORM"],
  ["Webframe", "FRAMEWORK"],
  ["DevEnvs", "TOOL"],
];

const GENERIC_DEVICON_TERMS = new Set([
  "app", "application", "code", "coding", "database", "development",
  "framework", "language", "library", "programming", "software", "tool",
  "web", "website",
]);

const FRIENDLY_ALIASES: Record<string, string[]> = {
  aws: ["AWS"],
  csharp: ["C Sharp"],
  cplusplus: ["C Plus Plus", "CPP"],
  dotnet: ["dotnet", ".NET"],
  mongodb: ["mongodb"],
  nextjs: ["NextJS"],
  nodejs: ["nodejs"],
  postgres: ["postgres"],
  react: ["React.js"],
  vue: ["Vue"],
};

function parseJson<T>(contents: string, label: string): T {
  try {
    return JSON.parse(contents) as T;
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function aliasesFor(values: string[], preferred: string) {
  const preferredKey = normalizeSkillName(preferred);
  const aliases = new Map<string, string>();
  for (const raw of values) {
    const label = cleanSkillLabel(raw);
    const key = normalizeSkillName(label);
    if (label && key && label !== preferred && !aliases.has(label.toLocaleLowerCase("en"))) {
      aliases.set(label.toLocaleLowerCase("en"), label);
    }
  }
  const labels = [...aliases.values()].sort((a, b) => a.localeCompare(b));
  const normalizedAliases = [...new Set(labels.map(normalizeSkillName))]
    .filter((key) => key !== preferredKey)
    .sort();
  return { aliases: labels, normalizedAliases };
}

function validateSurveyRow(value: unknown, section: string): asserts value is SurveyRow {
  const row = value as Partial<SurveyRow> | null;
  if (!row || typeof row.response !== "string" || !Number.isInteger(row.frequency) ||
      typeof row.percent !== "number" || !Number.isFinite(row.percent)) {
    throw new Error(`Invalid survey row in ${section}.datasets.${section}.data.`);
  }
}

function deviconLookup(entries: DeviconEntry[]) {
  const candidates = new Map<string, Array<{ entry: DeviconEntry; rank: number }>>();
  for (const entry of entries) {
    if (!entry || typeof entry.name !== "string" || !Array.isArray(entry.altnames) || !Array.isArray(entry.tags)) {
      throw new Error("devicon.json contains an invalid entry.");
    }
    const add = (value: string, rank: number) => {
      const key = normalizeSkillName(value);
      if (!key || GENERIC_DEVICON_TERMS.has(key)) return;
      candidates.set(key, [...(candidates.get(key) ?? []), { entry, rank }]);
    };
    add(entry.name, 3);
    entry.altnames.forEach((value) => add(value, 2));
    entry.tags.forEach((value) => add(value, 1));
  }
  return (key: string) => {
    const matches = (candidates.get(key) ?? []).sort((a, b) => b.rank - a.rank || a.entry.name.localeCompare(b.entry.name));
    if (!matches[0] || (matches[1] && matches[0].rank === matches[1].rank && matches[0].entry.name !== matches[1].entry.name)) {
      return undefined;
    }
    return matches[0].entry;
  };
}

function validateCuratedSkill(value: unknown, index: number): PreparedSkill {
  const row = value as Partial<CuratedSkillInput> | null;
  const label = `curated-skills.json record ${index + 1}`;
  if (!row || typeof row.name !== "string" || cleanSkillLabel(row.name) !== row.name) {
    throw new Error(`${label} has an invalid display name.`);
  }
  if (!Array.isArray(row.aliases) || !row.aliases.every((alias) => typeof alias === "string")) {
    throw new Error(`${label} has invalid aliases.`);
  }
  if (!Array.isArray(row.categories) || row.categories.length === 0 ||
      !row.categories.every((category) => SKILL_CATEGORIES.includes(category))) {
    throw new Error(`${label} has invalid categories.`);
  }
  const normalizedName = normalizeSkillName(row.name);
  if (!normalizedName) throw new Error(`${label} has an empty normalized name.`);
  return {
    name: row.name,
    normalizedName,
    ...aliasesFor(row.aliases, row.name),
    categories: [...new Set(row.categories)],
    popularity: null,
    frequency: null,
    iconKey: null,
    sources: ["CURATED"],
    active: true,
  };
}

export function prepareCatalogue(
  technology: TechnologyFile,
  devicons: DeviconEntry[],
  curatedInput: unknown[] = [],
): PreparedSkill[] {
  const findDevicon = deviconLookup(devicons);
  const records = new Map<string, PreparedSkill>();

  for (const [section, category] of SECTIONS) {
    const rows = technology[section]?.datasets?.[section]?.data;
    if (!Array.isArray(rows)) throw new Error(`Missing ${section}.datasets.${section}.data.`);
    for (const value of rows) {
      validateSurveyRow(value, section);
      const name = cleanSkillLabel(value.response);
      const normalizedName = normalizeSkillName(name);
      if (!normalizedName) throw new Error(`Empty skill name in ${section}.`);
      const existing = records.get(normalizedName);
      if (existing) {
        if (!existing.categories.includes(category)) existing.categories.push(category);
        if (name !== existing.name) existing.aliases.push(name);
        existing.frequency = Math.max(existing.frequency ?? 0, value.frequency);
        existing.popularity = Math.max(existing.popularity ?? 0, value.percent);
        continue;
      }
      records.set(normalizedName, {
        name,
        normalizedName,
        aliases: [],
        normalizedAliases: [],
        categories: [category],
        popularity: value.percent,
        frequency: value.frequency,
        iconKey: null,
        sources: ["STACK_OVERFLOW"],
        active: true,
      });
    }
  }

  for (const record of records.values()) {
    const devicon = findDevicon(record.normalizedName);
    const candidates = [...record.aliases, ...(FRIENDLY_ALIASES[record.normalizedName] ?? [])];
    if (devicon) {
      record.iconKey = devicon.name;
      record.sources.push("DEVICON");
      candidates.push(devicon.name, ...(devicon.altnames ?? []));
      candidates.push(...(devicon.tags ?? []).filter((tag) => !GENERIC_DEVICON_TERMS.has(normalizeSkillName(tag))));
    }
    Object.assign(record, aliasesFor(candidates, record.name));
    record.categories.sort((a, b) => SKILL_CATEGORIES.indexOf(a) - SKILL_CATEGORIES.indexOf(b));
  }

  const curatedSkills = curatedInput.map(validateCuratedSkill);
  curatedSkills.forEach((curated) => {
    const existing = records.get(curated.normalizedName);
    if (!existing) {
      records.set(curated.normalizedName, structuredClone(curated));
      return;
    }
    existing.categories = [...new Set([...existing.categories, ...curated.categories])];
    existing.sources = [...new Set([...existing.sources, "CURATED"])];
    const mergedAliases = aliasesFor([...existing.aliases, ...curated.aliases, curated.name], existing.name);
    existing.aliases = mergedAliases.aliases;
    existing.normalizedAliases = mergedAliases.normalizedAliases;
  });

  for (const record of records.values()) {
    record.categories.sort((a, b) => SKILL_CATEGORIES.indexOf(a) - SKILL_CATEGORIES.indexOf(b));
  }

  const names = new Set(records.keys());
  const curatedAliasOwners = new Map<string, string>();
  for (const curated of curatedSkills) for (const alias of curated.normalizedAliases) {
    const owner = curatedAliasOwners.get(alias);
    if (owner && owner !== curated.normalizedName) {
      throw new Error(`Curated alias ${alias} belongs to more than one skill.`);
    }
    curatedAliasOwners.set(alias, curated.normalizedName);
  }
  const aliasOwners = new Map<string, Set<string>>();
  for (const record of records.values()) for (const alias of record.aliases) {
    const key = normalizeSkillName(alias);
    if (key && key !== record.normalizedName) {
      const owners = aliasOwners.get(key) ?? new Set<string>();
      owners.add(record.normalizedName);
      aliasOwners.set(key, owners);
    }
  }
  for (const record of records.values()) {
    const safeAliases = record.aliases.filter((alias) => {
      const key = normalizeSkillName(alias);
      const curatedOwner = curatedAliasOwners.get(key);
      if (curatedOwner) return curatedOwner === record.normalizedName;
      return key === record.normalizedName ||
        (!names.has(key) && (aliasOwners.get(key)?.size ?? 0) === 1);
    });
    Object.assign(record, aliasesFor(safeAliases, record.name));
  }

  return [...records.values()].sort((a, b) =>
    (b.popularity ?? -1) - (a.popularity ?? -1) ||
    (b.frequency ?? -1) - (a.frequency ?? -1) || a.name.localeCompare(b.name));
}

export async function prepareCatalogueFiles(technologyPath: string, deviconPath: string, curatedPath: string) {
  const [technologyContents, deviconContents, curatedContents] = await Promise.all([
    readFile(technologyPath, "utf8"),
    readFile(deviconPath, "utf8"),
    readFile(curatedPath, "utf8"),
  ]);
  const technology = parseJson<TechnologyFile>(technologyContents, "technology.json");
  const devicons = parseJson<DeviconEntry[]>(deviconContents, "devicon.json");
  const curated = parseJson<unknown[]>(curatedContents, "curated-skills.json");
  if (!Array.isArray(devicons)) throw new Error("devicon.json must contain an array.");
  if (!Array.isArray(curated)) throw new Error("curated-skills.json must contain an array.");
  return prepareCatalogue(technology, devicons, curated);
}
