import { prisma } from "../src/lib/prisma";

async function testDashboard() {
  console.log("--- Testing Mock DB groupBy ---");
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  const casesByStatus = await prisma.case.groupBy({
    by: ["status"],
    where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
    _count: { id: true },
  });

  console.log("casesByStatus result:", JSON.stringify(casesByStatus, null, 2));

  const totalCasesMonth = await prisma.case.count({
    where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
  });
  console.log("totalCasesMonth:", totalCasesMonth);

  const totalSalesMonth = await prisma.case.aggregate({
    where: { receivedAt: { gte: startOfMonth, lte: endOfMonth } },
    _sum: { totalAmount: true },
  });
  console.log("totalSalesMonth:", totalSalesMonth);
}

testDashboard().catch(console.error);
