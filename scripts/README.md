# Skill catalogue pipeline

AU Connect's skill catalogue is built locally from three checked-in sources. The
pipeline makes no network requests and does not use ESCO.

## Files

- `data/skills/source/technology.json`: Stack Overflow technology survey data.
- `data/skills/source/devicon.json`: Devicon names, alternate names, tags, and
  icon keys.
- `data/skills/source/curated-skills.json`: a compact, reviewed set of
  professional skills for technical and nontechnical work.
- `data/skills/catalogue.json`: deterministic prepared artifact committed with
  the source files.

Only the main worked-with datasets at `Language.datasets.Language.data`,
`Database.datasets.Database.data`, `Platform.datasets.Platform.data`,
`Webframe.datasets.Webframe.data`, and `DevEnvs.datasets.DevEnvs.data` are
selected. They map to `LANGUAGE`, `DATABASE`, `PLATFORM`, `FRAMEWORK`, and
`TOOL`. All audience-specific, learning, professional, `WW_*`, `DA_*`, and
unlisted sections are ignored.

Devicon never adds a skill. It enriches a selected Stack Overflow record with
an icon key and useful alternate names/tags when a unique normalized match is
found. Generic terms such as `framework`, `tool`, and `programming` are
discarded. A small explicit alias table covers common spellings such as AWS,
Node.js, C#, C++, PostgreSQL, React, Vue, Next.js, and .NET.

Curated records use `CURATED` as their source and have null survey metrics and
icon keys. They cover soft skills, business, management, marketing, design,
data, finance, sales, human resources, operations, writing/media, and research.
Explicit curated aliases such as SEO, SEM, CRM, UI, and UX take precedence over
ambiguous Devicon tags. Other aliases that collide with a different skill name
or more than one catalogue record are removed during preparation.

## New database bootstrap

The bootstrap is the normal deployment path. It validates all sources,
regenerates and validates the deterministic combined catalogue, prints total
and per-category counts, and then plans or applies normalized-name upserts.

```sh
pnpm install
pnpm prisma generate
pnpm prisma db push

pnpm skills:bootstrap:dry
pnpm skills:bootstrap
```

`skills:bootstrap:dry` is the default-safe form and performs no database
writes. `skills:bootstrap` passes the required `--write` flag. Before write
mode, operators must confirm that `DATABASE_URL` identifies the intended
database. Bootstrap never calls the reset script, deletes skills or junctions,
deactivates records, or replaces a collection wholesale.

## Lower-level commands

```sh
pnpm skills:prepare
pnpm skills:prepare:check
pnpm skills:import:dry
```

Preparation validates all source shapes, merges equal normalized names,
unions their categories, and retains the maximum survey frequency/popularity
instead of double-counting the same respondent across sections. Output order is
popularity descending, frequency descending, then name. Atomic file replacement
makes regeneration safe.

Search ranking is exact normalized name, exact alias, name prefix, alias
prefix, then name substring. Survey popularity is only a tie-breaker, followed
by display name, so curated skills are not displaced by unrelated technologies.

Normalization lives in `lib/skill-normalization.ts` and is also used by search
and catalogue import. It applies Unicode NFKC, trimming, lowercasing, whitespace
collapse, punctuation removal, symbol-aware C#/C++ handling, and a narrow set
of technology equivalences. Display labels remain unchanged.

## Replacing an obsolete catalogue

If a database still contains the previous ESCO catalogue, reset it before
applying the unique `normalizedName` index. The reset is dry-run by default,
preserves User and JobPost documents, and writes a local backup before a
confirmed deletion:

```sh
pnpm skills:reset:dry
pnpm skills:reset
```

Review the dry-run counts and backup policy before confirming. Then apply the
Prisma schema using the project's normal deployment procedure. Prisma 6.19 with
MongoDB validates the `SkillCategory[]` enum list used by this schema.

```sh
pnpm exec prisma validate
pnpm exec prisma generate
pnpm skills:import:dry
# Review totals, then write:
pnpm skills:bootstrap
```

`DATABASE_URL` is loaded from the explicit environment, `.env.local`, then
`.env`. The importer validates every prepared record before connecting. It
matches by unique `normalizedName`, updates existing documents in place (so
UserSkill and JobSkill IDs remain valid), and inserts missing records. It never
deletes or deactivates catalogue or junction documents. A repeat import reports
all records unchanged. Pause other
catalogue writers while importing; rerunning after an interruption is safe.

An alternate prepared file can be inspected without writes:

```sh
pnpm skills:import:dry -- --input path/to/catalogue.json
```

The separate reset command is destructive and remains dry-run by default. It
backs up skill and junction documents before a confirmed reset; see its CLI
help and package scripts before use.

## Tests

```sh
pnpm test
pnpm typecheck
```

The catalogue tests cover required normalization equivalences, selected-section
filtering, Devicon enrichment, deterministic generation against the real local
files, validation, dry-run behavior, updates that preserve IDs, deactivation,
and rerun idempotency.
