import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createCaseSchema = z.object({
  caseCode:       z.string().min(1),
  doctorId:       z.string().min(1),
  patientName:    z.string().min(1),
  productTypeId:  z.string().min(1),
  color:          z.string().optional(),
  units:          z.number().min(1),
  pricePerUnit:   z.number().min(0),
  receivedAt:     z.string(),
  deliveryDate:   z.string().optional(),
  notes:          z.string().optional(),
  teethMap:       z.array(z.number()).optional(),
});

// GET /api/cases
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canView = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || (session.user.permissions?.canViewCases ?? true);
  if (!canView) {
    return NextResponse.json({ error: "غير مصرح لك بعرض الحالات" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status   = searchParams.get("status");
  const doctorId = searchParams.get("doctorId");
  const month    = searchParams.get("month");
  const year     = searchParams.get("year");

  const where: Record<string, unknown> = {};
  if (status)   where.status = status;
  if (doctorId) where.doctorId = doctorId;
  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end   = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.receivedAt = { gte: start, lte: end };
  }

  const cases = await prisma.case.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { doctor: true, productType: true },
  });

  return NextResponse.json(cases);
}

// POST /api/cases
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canEdit = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canEditCases;
  if (!canEdit) {
    return NextResponse.json({ error: "غير مصرح لك بإضافة أو تعديل الحالات" }, { status: 403 });
  }

  const body = await req.json();
  const result = createCaseSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة", details: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;

  // Check for duplicate case code
  const existing = await prisma.case.findUnique({ where: { caseCode: data.caseCode } });
  if (existing) {
    return NextResponse.json({ error: `كود الحالة ${data.caseCode} موجود بالفعل` }, { status: 409 });
  }

  const totalAmount = data.units * data.pricePerUnit;

  const newCase = await prisma.case.create({
    data: {
      caseCode:      data.caseCode,
      doctorId:      data.doctorId,
      patientName:   data.patientName,
      productTypeId: data.productTypeId,
      color:         data.color || null,
      units:         data.units,
      pricePerUnit:  data.pricePerUnit,
      totalAmount,
      remaining:     totalAmount, // no payment yet
      receivedAt:    new Date(data.receivedAt),
      deliveryDate:  data.deliveryDate ? new Date(data.deliveryDate) : null,
      notes:         data.notes || null,
      teethMap:      data.teethMap || [],
    },
    include: { doctor: true, productType: true },
  });


  // Audit log
  await prisma.auditLog.create({
    data: {
      userId:   session.user.id,
      action:   "CREATE_CASE",
      entity:   "Case",
      entityId: newCase.id,
      newData:  newCase as object,
    },
  });

  return NextResponse.json(newCase, { status: 201 });
}
