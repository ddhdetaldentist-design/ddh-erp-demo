import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating all case codes to the new format: [Day 2 digits][Month 2 digits][Sequence starting at 11]...");

  // Fetch all cases ordered by receivedAt and id
  const cases = await prisma.case.findMany({
    orderBy: [
      { receivedAt: "asc" },
      { id: "asc" }
    ]
  });

  console.log(`Found ${cases.length} cases to migrate.`);

  // First, assign temporary codes to prevent unique constraint conflicts during updates
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const tempCode = `TEMP_${c.id}_${Math.random().toString(36).substring(2, 7)}`;
    await prisma.case.update({
      where: { id: c.id },
      data: { caseCode: tempCode }
    });
  }
  console.log("Assigned temporary codes to avoid unique constraint violations.");

  // Group by day and month prefix (e.g. "1807" for July 18)
  // We keep a counter for each prefix starting at 11
  const prefixCounters = new Map<string, number>();

  for (const c of cases) {
    const date = new Date(c.receivedAt);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(month).padStart(2, "0");
    const prefix = `${dayStr}${monthStr}`;

    let seq = prefixCounters.get(prefix) ?? 11;
    const finalCode = `${prefix}${seq}`;
    prefixCounters.set(prefix, seq + 1);

    await prisma.case.update({
      where: { id: c.id },
      data: { caseCode: finalCode }
    });

    console.log(`Updated case ID ${c.id}: New Code: "${finalCode}" (for receivedAt: ${c.receivedAt.toISOString().split("T")[0]})`);
  }

  console.log("Case codes migration completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
