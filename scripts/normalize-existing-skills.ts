import { pathToFileURL } from "node:url";
import { client, dryRunArgument, groupSkills, mergeGroup, readSkills, safeError } from "./lib/skill-tools";

export async function main() {
  const dryRun = dryRunArgument();
  const db = client();
  const totals = { read: 0, groups: 0, processed: 0, duplicates: 0, deleted: 0,
    jobMoved: 0, jobDeduplicated: 0, userMoved: 0, userDeduplicated: 0, failed: 0 };
  console.info(dryRun ? "DRY RUN: totals describe planned changes; no writes." : "Normalizing skills. Pause other skill writers until complete.");
  try {
    const skills = await readSkills(db);
    totals.read = skills.length;
    const groups = groupSkills(skills);
    totals.groups = groups.size;
    totals.duplicates = skills.length - groups.size;
    for (const group of groups.values()) {
      try {
        const changes = dryRun
          ? await mergeGroup(db, group, true)
          : await db.$transaction((tx) => mergeGroup(tx, group, false), { timeout: 60_000 });
        totals.processed++;
        totals.deleted += group.length - 1;
        for (const key of ["jobMoved", "jobDeduplicated", "userMoved", "userDeduplicated"] as const) totals[key] += changes[key];
      } catch (error) {
        totals.failed++;
        console.error(`Group ${group[0].id} failed; its transaction was rolled back. ${safeError(error)}`);
        process.exitCode = 1;
        break;
      }
    }
  } catch (error) {
    totals.failed++;
    process.exitCode = 1;
    console.error(safeError(error));
  } finally {
    console.info(JSON.stringify({ dryRun, ...totals }));
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error("Normalization could not complete. Check arguments and app DATABASE_URL."); process.exitCode = 1; });
}
