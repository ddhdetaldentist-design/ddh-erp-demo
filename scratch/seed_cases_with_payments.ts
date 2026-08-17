import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const casesData = [
  { caseCode: "11187", doctorName: "أحمد إبراهيم",   patientName: "الحاجة قمر",  productType: "Z",          color: "A1",   units: 1, pricePerUnit: 550, collected: 100,  receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "12187", doctorName: "أحمد عادل جميل", patientName: "يوسف شاهين",  productType: "PFM",        color: "A2",   units: 2, pricePerUnit: 250, collected: 400,  receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "13187", doctorName: "محمود تركي",      patientName: "الحاج جمال",  productType: "Night Guard",color: "A3",   units: 3, pricePerUnit: 250, collected: 900,  receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "14187", doctorName: "أحمد زين",        patientName: "أحمد",        productType: "flix",       color: "3M1",  units: 4, pricePerUnit: 300, collected: 1600, receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "15187", doctorName: "يوسف تركي",       patientName: "مصطفي",       productType: "ZDMAX",      color: "3M2",  units: 5, pricePerUnit: 850, collected: 2500, receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "16187", doctorName: "محمود عبدالنبي",  patientName: "عادل",        productType: "Space Maintainer", color: "3M3", units: 6, pricePerUnit: 250, collected: 3600, receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "17187", doctorName: "أمنية جبر",       patientName: "محمد",        productType: "CAST",       color: "4M1",  units: 7, pricePerUnit: 100, collected: 3500, receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "18187", doctorName: "عائشة",           patientName: "سارة أحمد",   productType: "PMMA",       color: "4M2",  units: 8, pricePerUnit: 50,  collected: 3200, receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "19187", doctorName: "عبدالرحمن طارق",  patientName: "شيرين",       productType: "ZIMPLANT",   color: "3R1.5",units: 9, pricePerUnit: 650, collected: 2700, receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "DELIVERED" },
  { caseCode: "20187", doctorName: "شادي مجدي",       patientName: "سعاد",        productType: "ZDMAX",      color: "3R2.5",units:10, pricePerUnit: 950, collected: 2000, receivedAt: "2026-07-18", deliveryDate: "2026-07-23", status: "COMPLETED" },
];

async function main() {
  console.log("Adding Excel cases and registering payments to CASH...");

  // Get admin user
  const adminUser = await prisma.user.findFirst();
  const createdById = adminUser ? adminUser.id : null;

  // Map doctors and product types for lookup
  const doctors = await prisma.doctor.findMany();
  const productTypes = await prisma.productType.findMany();

  const docMap = new Map(doctors.map(d => [d.name, d.id]));
  const ptMap = new Map(productTypes.map(pt => [pt.name, pt.id]));

  for (const c of casesData) {
    const doctorId = docMap.get(c.doctorName);
    const productTypeId = ptMap.get(c.productType);

    if (!doctorId || !productTypeId) {
      console.warn(`Skipping case ${c.caseCode} because doctor (${c.doctorName}) or product type (${c.productType}) was not found.`);
      continue;
    }

    const totalAmount = c.units * c.pricePerUnit;
    const remaining = totalAmount - c.collected;

    // Create case
    const createdCase = await prisma.case.upsert({
      where: { caseCode: c.caseCode },
      update: {
        doctorId,
        patientName: c.patientName,
        productTypeId,
        color: c.color,
        units: c.units,
        pricePerUnit: c.pricePerUnit,
        totalAmount,
        collected: c.collected,
        remaining,
        receivedAt: new Date(c.receivedAt),
        deliveryDate: c.deliveryDate ? new Date(c.deliveryDate) : null,
        status: c.status as any,
      },
      create: {
        caseCode: c.caseCode,
        doctorId,
        patientName: c.patientName,
        productTypeId,
        color: c.color,
        units: c.units,
        pricePerUnit: c.pricePerUnit,
        totalAmount,
        collected: c.collected,
        remaining,
        receivedAt: new Date(c.receivedAt),
        deliveryDate: c.deliveryDate ? new Date(c.deliveryDate) : null,
        status: c.status as any,
      }
    });

    console.log(`Created/Updated case: ${createdCase.caseCode}`);

    // If collected > 0, check if a payment already exists
    if (c.collected > 0) {
      const existingPayment = await prisma.payment.findFirst({
        where: { caseId: createdCase.id }
      });

      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            caseId: createdCase.id,
            amount: c.collected,
            paymentMethod: "CASH",
            paidAt: new Date(c.receivedAt),
            createdById,
          }
        });
        console.log(`Registered CASH payment for case: ${createdCase.caseCode} of amount: ${c.collected}`);
      } else {
        // Update existing payment to CASH and correct amount
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount: c.collected,
            paymentMethod: "CASH",
          }
        });
        console.log(`Updated existing payment for case ${createdCase.caseCode} to CASH and amount: ${c.collected}`);
      }
    }
  }

  console.log("All Excel cases added successfully and payments recorded under CASH.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
