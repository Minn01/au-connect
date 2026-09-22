import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";
import { Prisma, PrismaClient } from "../../lib/generated/prisma";

export class SkillInputError extends Error {}

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

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

export function safeError(error: unknown) {
  if (error instanceof SkillInputError) return error.message;
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  return "Operation failed; check database availability, schema, and input.";
}
