import "server-only";

import { MAX_SKILL_SEARCH_RESULTS } from "@/lib/constants";
import prisma from "@/lib/prisma";

export type SkillSearchResult = { id: string; name: string };

export function normalizeSkillQuery(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
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
  normalizedName: string | null;
  normalizedAliases: string[];
  source: "ESCO" | "USER_CREATED";
  _count: { userSkills: number; jobSkills: number };
};

type SkillStore = {
  findMany(args: unknown): Promise<SearchRow[]>;
};

function rank(row: SearchRow, query: string) {
  const name = row.normalizedName ?? "";
  const aliasMatch = row.normalizedAliases.some(
    (alias) => alias === query || alias.startsWith(query),
  );
  const matchRank = name === query ? 0 : name.startsWith(query) ? 1 : aliasMatch ? 2 : 3;
  return {
    matchRank,
    usage: row._count.userSkills + row._count.jobSkills,
    sourceRank: row.source === "ESCO" ? 1 : 0,
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
    // Prisma parameterizes these filters, so user text never becomes executable
    // Mongo syntax. Alias lookup is exact/prefix-ranked among bounded candidates.
    rows = await store.findMany({
      where: {
        OR: [
          { normalizedName: { contains: query, mode: "insensitive" } },
          { normalizedAliases: { has: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        normalizedAliases: true,
        source: true,
        _count: { select: { userSkills: true, jobSkills: true } },
      },
      take: Math.min(limit * 8, 120),
    });
  } else {
    rows = await store.findMany({
      where: { OR: [{ userSkills: { some: {} } }, { jobSkills: { some: {} } }] },
      select: {
        id: true,
        name: true,
        normalizedName: true,
        normalizedAliases: true,
        source: true,
        _count: { select: { userSkills: true, jobSkills: true } },
      },
      take: 80,
    });

    if (rows.length === 0) {
      rows = await store.findMany({
        where: {
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
          source: true,
          _count: { select: { userSkills: true, jobSkills: true } },
        },
      });
    }
  }

  return rows
    .sort((left, right) => {
      const a = rank(left, query);
      const b = rank(right, query);
      return (
        a.matchRank - b.matchRank ||
        b.usage - a.usage ||
        a.sourceRank - b.sourceRank ||
        left.name.localeCompare(right.name)
      );
    })
    .slice(0, limit)
    .map(({ id, name }) => ({ id, name }));
}
