import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const doctors = await prisma.doctor.findMany({ select: { id: true, name: true } });
  const productTypes = await prisma.productType.findMany({ select: { id: true, name: true } });
  const employees = await prisma.employee.findMany({ select: { id: true, name: true } });

  console.log("Doctors:", doctors);
  console.log("ProductTypes:", productTypes);
  console.log("Employees:", employees);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
