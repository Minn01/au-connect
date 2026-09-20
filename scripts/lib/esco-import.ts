import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import type { Skill } from "../../lib/generated/prisma";
import { aliasesFor, normalize, SkillInputError } from "./skill-tools";

export type EscoSkill = {
  name: string; normalizedName: string; externalId: string;
  aliases: string[]; normalizedAliases: string[]; source: "ESCO"; escoVersion: string;
};

export async function* csvRows(path: string, onHeaders: (headers: string[]) => void = () => {}) {
  const input = createReadStream(path);
  const parser = parse({ bom: true, skip_empty_lines: true, columns(headers: string[]) {
    onHeaders(headers);
    for (const required of ["preferredLabel", "conceptUri", "altLabels"]) {
      if (!headers.includes(required)) throw new SkillInputError(`Missing CSV header: ${required}`);
    }
    if (new Set(headers).size !== headers.length) throw new SkillInputError("Duplicate CSV headers.");
    return headers;
  } });
  input.on("error", (error) => parser.destroy(error));
  input.pipe(parser);
  try {
    for await (const row of parser) yield row as Record<string, string>;
  } finally {
    input.destroy();
    parser.destroy();
  }
}

export function escoSkill(row: Record<string, string>): EscoSkill {
  const name = row.preferredLabel.trim();
  const externalId = row.conceptUri.trim();
  if (!normalize(name)) throw new SkillInputError("Empty preferredLabel.");
  if (!/^https?:\/\/data\.europa\.eu\/esco\/skill\/[^\s/?#]+$/.test(externalId)) {
    throw new SkillInputError("Invalid ESCO skill conceptUri.");
  }
  return {
    name, normalizedName: normalize(name), externalId,
    ...aliasesFor(row.altLabels.split(/\r\n|\n|\r/), name),
    source: "ESCO", escoVersion: "1.2.1",
  };
}

export function importData(existing: Skill | undefined, incoming: EscoSkill): EscoSkill {
  if (existing?.externalId && existing.externalId !== incoming.externalId) {
    throw new SkillInputError("Normalized label belongs to another external concept; refusing to overwrite.");
  }
  return {
    ...incoming,
    ...aliasesFor([...(existing?.aliases ?? []), ...(existing ? [existing.name] : []), ...incoming.aliases], incoming.name),
  };
}

export function unchanged(existing: Skill, data: EscoSkill) {
  return (Object.keys(data) as (keyof EscoSkill)[]).every((key) => JSON.stringify(existing[key]) === JSON.stringify(data[key]));
}
