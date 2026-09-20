# Skill maintenance

These commands use `lib/generated/prisma`, as configured in `prisma/schema.prisma`.
No script pushes the schema or creates database indexes automatically.

Database selection: an explicitly set `DATABASE_URL` takes precedence over the
repository's `.env.local`, then `.env`. Paths are resolved relative to this
repository, not the shell's current directory. Empty/invalid overrides fail
instead of falling back. Connection strings and raw Prisma errors are never
printed. Both dry runs read the selected database but do not write.

Run these commands manually, in order:

```sh
pnpm exec prisma validate
pnpm exec prisma generate
pnpm skills:normalize:dry
# Review the planned changes before running the next command (writes).
pnpm skills:normalize
pnpm skills:import:dry
# Review the planned changes before running the next command (writes).
pnpm skills:import
```

Use a MongoDB replica set for normalization, which moves relations in
transactions. Pause app writes and other skill maintenance processes until
finished. The importer uses individual atomic MongoDB reads and writes and does
not open interactive transactions. The current schema has a non-unique
`normalizedName` index, so import remains idempotent for serial runs but cannot
guarantee uniqueness against concurrent inserts. Normalize successfully first.

Normalization uses Unicode NFKC, trimmed/collapsed whitespace and lowercase.
Canonical selection prefers an ESCO record, then the lowest ObjectId. Every
group is atomic: both relation types move before duplicate skills are deleted.
When a relation already exists, its duplicate is removed; overlapping UserSkill
relations retain the lowest `order`. Existing aliases are merged. Groups with
conflicting external IDs or blank names require manual resolution and fail
preflight. Totals distinguish moved and deduplicated relations. Earlier groups
remain committed if a later transaction fails; rerunning is safe.

Import streams `data/esco/skills_en.csv` with a real CSV parser and validates the
actual headers: `preferredLabel`, `conceptUri`, `altLabels`. Quoted multiline
fields, escaped quotes, commas, CRLF and a BOM are supported. Alternative labels
are split on newlines, normalized and deduplicated. Existing aliases are retained.
The preferred label supplies `name`; the URI supplies `externalId`. Records are
marked `source: ESCO`, `escoVersion: 1.2.1`.

The importer streams records sequentially. Matching uses `normalizedName` and
the ESCO URI; updates preserve the Skill ID and never edit JobSkill or UserSkill
records. Unchanged rows count as skipped. A transient Prisma `P2028` is retried
up to three times after 100, 200 and 400 ms. Each attempt starts with a fresh
read, so a write that committed before an ambiguous error becomes an idempotent
skip or update. Validation failures, raw-query `P2010` errors and duplicate-key
errors are recorded immediately without blind retries.

Every failed attempt is logged as JSON with Prisma code, message, metadata, CSV
record number, concept URI and preferred label. Final failures are written with
their original CSV fields to `data/esco/skills_en.failed.json` using an atomic
file replacement. Import only those records with:

```sh
pnpm skills:import -- --retry-file data/esco/skills_en.failed.json
```

The retry run replaces that file with any records still failing; an empty
`records` array means all retries succeeded. Use `--failed-file <path>` to choose
another output. Dry-run reads either source but writes no retry file. Completion
prints inserted, updated, skipped, retried and failed totals. Any remaining
record, input-stream, or retry-file failure exits with status 1. Earlier writes
remain committed, and rerunning safely skips them.

Tests (in-memory database double and local CSV only):

```sh
pnpm exec tsx --test tests/skillMaintenance.test.ts
```

The existing application helper `lib/jobSkillFunctions.ts` and legacy migration
`migration_scripts/migrate-job-requirements-to-skills.ts` still upsert by unique
`name`. The current schema removes that uniqueness, so those existing call sites
need a separate compatibility update before deploying the schema/application.
