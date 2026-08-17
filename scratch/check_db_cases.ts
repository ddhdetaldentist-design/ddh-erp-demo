import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cases = await prisma.case.findMany({
    select: {
      id: true,
      caseCode: true,
      patientName: true,
      collected: true,
      payments: {
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
        }
      }
    }
  });
  console.log("Current Cases:", JSON.stringify(cases, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
