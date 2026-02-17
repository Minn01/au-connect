import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();

function extractMediaTypes(media: unknown): string[] {
  if (!Array.isArray(media)) return [];

  const types = media
    .map((m: any) => m?.type)
    .filter((t: any) => typeof t === "string" && t.trim().length > 0)
    .map((t: string) => t.trim().toLowerCase());

  return Array.from(new Set(types));
}

async function main() {
  const posts = await prisma.post.findMany({
    select: { id: true, media: true, mediaTypes: true },
  });

  let updated = 0;

  for (const p of posts) {
    const computed = extractMediaTypes(p.media);

    const existing = Array.isArray(p.mediaTypes) ? p.mediaTypes : [];
    const same =
      existing.length === computed.length &&
      existing.every((v) => computed.includes(v));

    if (same) continue;

    await prisma.post.update({
      where: { id: p.id },
      data: { mediaTypes: computed },
    });

    updated++;
  }

  console.log(`✅ Backfill done. Updated ${updated} posts.`);
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
