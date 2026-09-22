import "server-only";

import { MAX_SKILL_SEARCH_RESULTS } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { normalizeSkillName } from "@/lib/skill-normalization";

export type SkillSearchResult = { id: string; name: string };

export function normalizeSkillQuery(value: string) {
  return normalizeSkillName(value);
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function clampSkillSearchLimit(value: number) {
  return Number.isInteger(value)
    ? Math.min(Math.max(value, 1), MAX_SKILL_SEARCH_RESULTS)
    : 10;
}

type SearchRow = {
  id: string;
  name: string;
  normalizedName: string;
  normalizedAliases: string[];
  popularity: number | null;
};

type SkillStore = {
  findMany(args: unknown): Promise<SearchRow[]>;
};

function rank(row: SearchRow, query: string) {
  const name = row.normalizedName;
  const exactAlias = row.normalizedAliases.includes(query);
  const aliasPrefix = row.normalizedAliases.some((alias) => alias.startsWith(query));
  const matchRank = name === query
    ? 0
    : exactAlias
      ? 1
      : name.startsWith(query)
        ? 2
        : aliasPrefix
          ? 3
          : name.includes(query)
            ? 4
            : Number.POSITIVE_INFINITY;
  return {
    matchRank,
    popularity: row.popularity ?? -1,
  };
}

export async function searchSkills(
  rawQuery: string,
  rawLimit: number,
  store: SkillStore = prisma.skill as unknown as SkillStore,
): Promise<SkillSearchResult[]> {
  const query = normalizeSkillQuery(rawQuery);
  const limit = clampSkillSearchLimit(rawLimit);

  if (query.length === 1) return [];

  let rows: SearchRow[];
  if (query.length >= 2) {
    // The catalogue is intentionally compact. Reading its active comparison
    // keys allows correct alias-prefix ranking, which Mongo scalar-list filters
    // cannot express through Prisma.
    rows = await store.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        normalizedAliases: true,
        popularity: true,
      },
      take: 500,
    });
  } else {
    rows = await store.findMany({
      where: {
        active: true,
        OR: [{ userSkills: { some: {} } }, { jobSkills: { some: {} } }],
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        normalizedAliases: true,
        popularity: true,
      },
      take: 80,
    });

    if (rows.length === 0) {
      rows = await store.findMany({
        where: {
          active: true,
          normalizedName: {
            in: [
              "communication",
              "teamwork",
              "project management",
              "microsoft office",
              "english",
            ],
          },
        },
        select: {
          id: true,
          name: true,
          normalizedName: true,
          normalizedAliases: true,
          popularity: true,
        },
      });
    }
  }

  return rows
    .filter((row) => query.length === 0 || Number.isFinite(rank(row, query).matchRank))
    .sort((left, right) => {
      const a = rank(left, query);
      const b = rank(right, query);
      return (
        a.matchRank - b.matchRank ||
        b.popularity - a.popularity ||
        left.name.localeCompare(right.name)
      );
    })
    .slice(0, limit)
    .map(({ id, name }) => ({ id, name }));
}
