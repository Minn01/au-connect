import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parse as parseEnv } from "dotenv";
import { PrismaClient, Prisma, type Skill } from "../../lib/generated/prisma";

export class SkillInputError extends Error {}

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const CSV_PATH = resolve(ROOT, "data/esco/skills_en.csv");
export const BATCH_SIZE = 100;

export function normalize(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function aliasesFor(names: string[], preferred: string) {
  const byNormalized = new Map<string, string>();
  for (const name of names) {
    const label = name.normalize("NFKC").trim().replace(/\s+/gu, " ");
    const key = normalize(label);
    if (key && key !== normalize(preferred) && !byNormalized.has(key)) {
      byNormalized.set(key, label);
    }
  }
  const keys = [...byNormalized.keys()].sort();
  return { aliases: keys.map((key) => byNormalized.get(key)!), normalizedAliases: keys };
}

export function dryRunArgument(args = process.argv.slice(2)) {
  if (args.some((arg) => arg !== "--dry-run")) {
    throw new SkillInputError("Only --dry-run is supported.");
  }
  return args.includes("--dry-run");
}

// Resolve files relative to the repository, never the caller's working directory.
// Explicit process env wins, then .env.local, then .env (Next.js precedence).
export function databaseUrl(env: Record<string, string | undefined> = process.env, root = ROOT) {
  let value = env.DATABASE_URL;
  for (const filename of [".env.local", ".env"]) {
    if (value !== undefined) break;
    try {
      value = parseEnv(readFileSync(resolve(root, filename))).DATABASE_URL;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new SkillInputError(`Cannot read ${filename}.`);
      }
    }
  }
  if (!value || !/^mongodb(?:\+srv)?:\/\//.test(value)) {
    throw new SkillInputError("DATABASE_URL must be a nonempty MongoDB URL in the app environment.");
  }
  return value;
}

export function client() {
  return new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
}

// Never print raw Prisma errors: connection URLs can contain credentials.
export function safeError(error: unknown) {
  if (error instanceof SkillInputError) return error.message;
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  return "Operation failed; check database availability, schema, replica set, and input.";
}

export async function readSkills(db: PrismaClient): Promise<Skill[]> {
  const skills: Skill[] = [];
  let lastId: string | undefined;
  while (true) {
    const page: Skill[] = await db.skill.findMany({
      orderBy: { id: "asc" }, take: BATCH_SIZE,
      ...(lastId ? { where: { id: { gt: lastId } } } : {}),
    });
    skills.push(...page);
    if (page.length < BATCH_SIZE) return skills;
    lastId = page[page.length - 1].id;
  }
}

export function groupSkills(skills: Skill[]) {
  const groups = new Map<string, Skill[]>();
  for (const skill of skills) {
    const key = normalize(skill.name);
    if (!key) throw new SkillInputError(`Skill ${skill.id} has an empty normalized name; repair it first.`);
    const group = groups.get(key) ?? [];
    group.push(skill);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    // Prefer ESCO metadata, then the oldest ObjectId; independent of input order.
    group.sort((a, b) => Number(b.source === "ESCO") - Number(a.source === "ESCO") || a.id.localeCompare(b.id));
    const uris = new Set(group.map((s) => s.externalId).filter(Boolean));
    if (uris.size > 1) throw new SkillInputError(`Conflicting external IDs in skill group ${group[0].id}; resolve manually.`);
  }
  return groups;
}

export async function mergeGroup(tx: Prisma.TransactionClient, group: Skill[], dryRun: boolean) {
  const [canonical, ...duplicates] = group;
  const ids = group.map((skill) => skill.id);
  const jobs = await tx.jobSkill.findMany({ where: { skillId: { in: ids } }, orderBy: { id: "asc" } });
  const users = await tx.userSkill.findMany({ where: { skillId: { in: ids } }, orderBy: { id: "asc" } });
  let jobMoved = 0, jobDeduplicated = 0, userMoved = 0, userDeduplicated = 0;
  const jobTargets = new Set(jobs.filter((r) => r.skillId === canonical.id).map((r) => r.jobPostId));
  for (const row of jobs.filter((r) => r.skillId !== canonical.id)) {
    if (jobTargets.has(row.jobPostId)) {
      if (!dryRun) await tx.jobSkill.delete({ where: { id: row.id } });
      jobDeduplicated++;
    } else {
      if (!dryRun) await tx.jobSkill.update({ where: { id: row.id }, data: { skillId: canonical.id } });
      jobTargets.add(row.jobPostId);
      jobMoved++;
    }
  }
  const userTargets = new Map(users.filter((r) => r.skillId === canonical.id).map((r) => [r.userId, r]));
  for (const row of users.filter((r) => r.skillId !== canonical.id)) {
    const target = userTargets.get(row.userId);
    if (target) {
      const order = Math.min(target.order, row.order);
      if (!dryRun) {
        if (order !== target.order) await tx.userSkill.update({ where: { id: target.id }, data: { order } });
        await tx.userSkill.delete({ where: { id: row.id } });
      }
      target.order = order;
      userDeduplicated++;
    } else {
      if (!dryRun) await tx.userSkill.update({ where: { id: row.id }, data: { skillId: canonical.id } });
      userTargets.set(row.userId, { ...row, skillId: canonical.id });
      userMoved++;
    }
  }
  if (!dryRun) {
    const metadata = group.find((skill) => skill.externalId);
    await tx.skill.update({ where: { id: canonical.id }, data: {
      normalizedName: normalize(canonical.name),
      ...aliasesFor(group.flatMap((s) => [s.name, ...s.aliases]), canonical.name),
      ...(metadata ? { externalId: metadata.externalId, escoVersion: metadata.escoVersion } : {}),
    } });
    for (const duplicate of duplicates) {
      // Check before deletion because UserSkill has cascading deletes.
      if (await tx.jobSkill.count({ where: { skillId: duplicate.id } }) ||
          await tx.userSkill.count({ where: { skillId: duplicate.id } })) {
        throw new SkillInputError("Relations remain; rolling back group.");
      }
      await tx.skill.delete({ where: { id: duplicate.id } });
    }
  }
  return { jobMoved, jobDeduplicated, userMoved, userDeduplicated };
}
