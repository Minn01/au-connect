import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { PrismaClient, Skill } from "../lib/generated/prisma";
import {
  CSV_PATH,
  ROOT,
  SkillInputError,
  client,
  normalize,
  readSkills,
} from "./lib/skill-tools";
import {
  csvRows,
  escoSkill,
  importData,
  type EscoSkill,
  unchanged,
} from "./lib/esco-import";

const DEFAULT_FAILED_FILE = resolve(ROOT, "data/esco/skills_en.failed.json");
const MAX_TRANSIENT_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 100;

type RawRow = Record<string, string>;
type ImportResult = "inserted" | "updated" | "skipped";

export type ImportTotals = {
  read: number;
  inserted: number;
  updated: number;
  skipped: number;
  retried: number;
  failed: number;
};

type ErrorDetails = { code: string; message: string; meta: unknown };
type FailedRecord = {
  recordNumber: number;
  conceptUri: string;
  preferredLabel: string;
  row: RawRow;
  error: ErrorDetails;
};
type RetryFile = {
  version: 1;
  source: string;
  generatedAt: string;
  records: FailedRecord[];
};

export type ImportOptions = {
  dryRun?: boolean;
  inputPath?: string;
  retryFilePath?: string;
  failedFilePath?: string;
  sleep?: (milliseconds: number) => Promise<void>;
};
export type CliOptions = Required<
  Pick<ImportOptions, "dryRun" | "failedFilePath">
> &
  Pick<ImportOptions, "inputPath" | "retryFilePath">;

function errorDetails(error: unknown): ErrorDetails {
  if (error && typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      message?: unknown;
      meta?: unknown;
    };
    return {
      code:
        typeof candidate.code === "string"
          ? candidate.code
          : error instanceof SkillInputError
            ? "VALIDATION"
            : "UNKNOWN",
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : String(error),
      meta: candidate.meta ?? null,
    };
  }
  return { code: "UNKNOWN", message: String(error), meta: null };
}

function json(value: unknown) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

function logRecordFailure(
  recordNumber: number,
  row: RawRow,
  error: unknown,
  attempt: number,
  willRetry: boolean,
) {
  const details = errorDetails(error);
  console.error(
    json({
      event: "esco_import_record_failure",
      recordNumber,
      conceptUri: row.conceptUri ?? "",
      preferredLabel: row.preferredLabel ?? "",
      attempt,
      willRetry,
      ...details,
    }),
  );
  return details;
}

function isTransient(error: unknown) {
  return errorDetails(error).code === "P2028";
}

async function delay(milliseconds: number) {
  await new Promise<void>((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

function matchingSkills(skills: Skill[], incoming: EscoSkill) {
  const nameMatches = skills.filter(
    (skill) => skill.normalizedName === incoming.normalizedName,
  );
  if (nameMatches.length > 1) {
    throw new SkillInputError(
      "Multiple skills have this normalized name; run skills:normalize first.",
    );
  }
  const uriMatches = skills.filter(
    (skill) => skill.externalId === incoming.externalId,
  );
  if (uriMatches.length > 1) {
    throw new SkillInputError(
      "Multiple skills have this ESCO concept URI; resolve them before importing.",
    );
  }
  const byName = nameMatches[0];
  const byUri = uriMatches[0];
  if (byName && byUri && byName.id !== byUri.id) {
    throw new SkillInputError(
      "The normalized name and ESCO concept URI belong to different skills.",
    );
  }
  if (byUri && byUri.normalizedName !== incoming.normalizedName) {
    throw new SkillInputError(
      "The ESCO concept URI already belongs to another normalized name.",
    );
  }
  return byName ?? byUri;
}

async function persistSkill(
  db: PrismaClient,
  incoming: EscoSkill,
): Promise<{ result: ImportResult; skill: Skill }> {
  // Every retry begins with a fresh read. If a P2028 was returned after MongoDB
  // committed the previous write, this sees it and avoids creating a duplicate.
  const matches = await db.skill.findMany({
    where: {
      OR: [
        { normalizedName: incoming.normalizedName },
        { externalId: incoming.externalId },
      ],
    },
  });
  const existing = matchingSkills(matches, incoming);
  const data = importData(existing, incoming);
  if (existing && unchanged(existing, data)) {
    return { result: "skipped", skill: existing };
  }

  // A single MongoDB document write is atomic. No subsequent operation runs in
  // a failed transaction. Keep other skill writers paused because the schema's
  // normalizedName index is not unique.
  if (existing) {
    return {
      result: "updated",
      skill: await db.skill.update({ where: { id: existing.id }, data }),
    };
  }
  return { result: "inserted", skill: await db.skill.create({ data }) };
}

async function* retryRows(path: string) {
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<RetryFile>;
  if (parsed.version !== 1 || !Array.isArray(parsed.records)) {
    throw new SkillInputError("Retry file has an unsupported format.");
  }
  for (const record of parsed.records) {
    if (
      !record ||
      !Number.isInteger(record.recordNumber) ||
      !record.row ||
      typeof record.row !== "object" ||
      Array.isArray(record.row)
    ) {
      throw new SkillInputError("Retry file contains an invalid record.");
    }
    yield { recordNumber: record.recordNumber, row: record.row };
  }
}

async function* inputRows(options: ImportOptions) {
  if (options.retryFilePath) {
    yield* retryRows(options.retryFilePath);
    return;
  }
  let recordNumber = 0;
  for await (const row of csvRows(
    options.inputPath ?? CSV_PATH,
    (headers) => console.info(`CSV headers: ${headers.join(", ")}`),
  )) {
    recordNumber += 1;
    yield { recordNumber, row };
  }
}

async function writeFailedFile(
  path: string,
  source: string,
  records: FailedRecord[],
) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  const contents: RetryFile = {
    version: 1,
    source,
    generatedAt: new Date().toISOString(),
    records,
  };
  await writeFile(temporaryPath, `${json(contents)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryPath, path);
}

export function parseImportArguments(args = process.argv.slice(2)): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    failedFilePath: DEFAULT_FAILED_FILE,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--retry-file" || argument === "--failed-file") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new SkillInputError(`${argument} requires a path.`);
      }
      if (argument === "--retry-file") options.retryFilePath = resolve(value);
      else options.failedFilePath = resolve(value);
      index += 1;
      continue;
    }
    throw new SkillInputError(`Unsupported argument: ${argument}`);
  }
  return options;
}

// Keep the original boolean/path form for existing callers and tests.
export async function importEsco(
  db: PrismaClient,
  optionsOrDryRun: ImportOptions | boolean = {},
  legacyInputPath?: string,
) {
  const options: ImportOptions =
    typeof optionsOrDryRun === "boolean"
      ? { dryRun: optionsOrDryRun, inputPath: legacyInputPath }
      : optionsOrDryRun;
  const dryRun = options.dryRun ?? false;
  const sleep = options.sleep ?? delay;
  const failedFilePath = options.failedFilePath ?? DEFAULT_FAILED_FILE;
  const source = options.retryFilePath ?? options.inputPath ?? CSV_PATH;
  const totals: ImportTotals = {
    read: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    retried: 0,
    failed: 0,
  };
  const failedRecords: FailedRecord[] = [];

  console.info(
    dryRun
      ? "DRY RUN: inserted/updated totals are planned; no database or retry-file writes."
      : "Importing ESCO 1.2.1. Pause other skill writers until complete.",
  );

  try {
    const normalizedNames = new Set<string>();
    const externalIds = new Set<string>();
    for (const skill of await readSkills(db)) {
      if (
        !skill.normalizedName ||
        skill.normalizedName !== normalize(skill.name) ||
        normalizedNames.has(skill.normalizedName)
      ) {
        throw new SkillInputError(
          "Run skills:normalize first: existing names are missing, stale, or duplicated.",
        );
      }
      normalizedNames.add(skill.normalizedName);
      if (skill.externalId) {
        if (externalIds.has(skill.externalId)) {
          throw new SkillInputError(
            "Existing ESCO concept URIs are duplicated; resolve them before importing.",
          );
        }
        externalIds.add(skill.externalId);
      }
    }

    for await (const { recordNumber, row } of inputRows(options)) {
      totals.read += 1;
      let attempt = 0;
      while (true) {
        attempt += 1;
        try {
          const incoming = escoSkill(row);
          if (dryRun) {
            const matches = await db.skill.findMany({
              where: {
                OR: [
                  { normalizedName: incoming.normalizedName },
                  { externalId: incoming.externalId },
                ],
              },
            });
            const existing = matchingSkills(matches, incoming);
            const data = importData(existing, incoming);
            const result: ImportResult =
              existing && unchanged(existing, data)
                ? "skipped"
                : existing
                  ? "updated"
                  : "inserted";
            totals[result] += 1;
          } else {
            const { result } = await persistSkill(db, incoming);
            totals[result] += 1;
          }
          break;
        } catch (error) {
          const willRetry =
            isTransient(error) &&
            attempt <= MAX_TRANSIENT_RETRIES;
          const details = logRecordFailure(
            recordNumber,
            row,
            error,
            attempt,
            willRetry,
          );
          if (willRetry) {
            totals.retried += 1;
            await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
            continue;
          }
          totals.failed += 1;
          failedRecords.push({
            recordNumber,
            conceptUri: row.conceptUri ?? "",
            preferredLabel: row.preferredLabel ?? "",
            row,
            error: details,
          });
          break;
        }
      }
      if (totals.read % 100 === 0) {
        console.info(`Processed ${totals.read} records.`);
      }
    }
    if (!totals.read) {
      throw new SkillInputError("Input has no skill records.");
    }
  } catch (error) {
    totals.failed += 1;
    console.error(
      json({ event: "esco_import_failure", ...errorDetails(error) }),
    );
  }

  if (!dryRun) {
    try {
      await writeFailedFile(failedFilePath, source, failedRecords);
      console.info(
        failedRecords.length
          ? `Wrote ${failedRecords.length} failed records to ${failedFilePath}.`
          : `Wrote an empty retry file to ${failedFilePath}.`,
      );
    } catch (error) {
      totals.failed += 1;
      console.error(
        json({
          event: "esco_import_retry_file_failure",
          path: failedFilePath,
          ...errorDetails(error),
        }),
      );
    }
  }

  console.info(json({ dryRun, ...totals }));
  return totals;
}

export async function main() {
  const options = parseImportArguments();
  const db = client();
  try {
    const totals = await importEsco(db, options);
    if (totals.failed) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      json({ event: "esco_import_startup_failure", ...errorDetails(error) }),
    );
    process.exitCode = 1;
  });
}
