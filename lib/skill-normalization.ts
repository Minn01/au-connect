/**
 * Produces a comparison/search key while leaving display labels untouched.
 * Keep explicit equivalences narrow: this is shared by catalogue preparation,
 * import, and application search.
 */
export function normalizeSkillName(value: string): string {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/gu, " ");

  const semanticSymbols = normalized
    .replace(/#/gu, " sharp ")
    .replace(/\+/gu, " plus ")
    .replace(/\s+/gu, " ")
    .trim();
  const compact = semanticSymbols.replace(/[\p{P}\p{S}\s]+/gu, "");
  const equivalences: Record<string, string> = {
    amazonwebservicesaws: "aws",
    aws: "aws",
    csharp: "csharp",
    cplus: "cplusplus",
    cplusplus: "cplusplus",
    dotnet: "dotnet",
    net: "dotnet",
    nextjs: "nextjs",
    nodejs: "nodejs",
    postgres: "postgres",
    postgresql: "postgres",
    react: "react",
    reactjs: "react",
    vue: "vue",
    vuejs: "vue",
  };
  if (equivalences[compact]) return equivalences[compact];

  return semanticSymbols
    .replace(/[\p{P}\p{S}]+/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function cleanSkillLabel(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}
