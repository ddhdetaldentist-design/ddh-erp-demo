import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/cases/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const caseItem = await prisma.case.findUnique({
    where: { id },
    include: {
      doctor: true,
      productType: true,
      payments: { orderBy: { paidAt: "desc" }, include: { courier: { select: { id: true, name: true } } } },
    },
  });

  if (!caseItem) {
    return NextResponse.json({ error: "الحالة غير موجودة" }, { status: 404 });
  }

  return NextResponse.json(caseItem);
}

// PATCH /api/cases/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Permission check for editing cases
  const canEdit = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canEditCases;
  if (!canEdit) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل الحالات" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const caseItem = await prisma.case.findUnique({ where: { id } });
  if (!caseItem) {
    return NextResponse.json({ error: "الحالة غير موجودة" }, { status: 404 });
  }

  // Calculate new total / remaining if units/price changed
  const units = body.units ?? caseItem.units;
  const pricePerUnit = body.pricePerUnit ?? caseItem.pricePerUnit;
  const totalAmount = units * pricePerUnit;
  const collected = body.collected ?? caseItem.collected;
  const remaining = totalAmount - collected;

  const updatedCase = await prisma.case.update({
    where: { id },
    data: {
      ...(body.caseCode && { caseCode: body.caseCode }),
      ...(body.doctorId && { doctorId: body.doctorId }),
      ...(body.productTypeId && { productTypeId: body.productTypeId }),
      ...(body.receivedAt && { receivedAt: new Date(body.receivedAt) }),
      ...(body.status && { status: body.status }),
      ...(body.patientName && { patientName: body.patientName }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.deliveryDate !== undefined && { deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null }),
      ...(body.proofSentAt !== undefined && { proofSentAt: body.proofSentAt ? new Date(body.proofSentAt) : null }),
      ...(body.proofReturnedAt !== undefined && { proofReturnedAt: body.proofReturnedAt ? new Date(body.proofReturnedAt) : null }),
      ...(body.marginDone !== undefined && { marginDone: body.marginDone }),
      ...(body.latheeDone !== undefined && { latheeDone: body.latheeDone }),
      ...(body.glazeDone !== undefined && { glazeDone: body.glazeDone }),
      ...(body.designDone !== undefined && { designDone: body.designDone }),
      ...(body.teethMap !== undefined && { teethMap: body.teethMap }),
      units,
      pricePerUnit,
      totalAmount,
      collected,
      remaining,
    },
    include: { doctor: true, productType: true, payments: { orderBy: { paidAt: "desc" } } },
  });

  return NextResponse.json(updatedCase);
}

// DELETE /api/cases/[id] (Delete case)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Permission check for deleting cases
  const canDelete = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canDeleteCases;
  if (!canDelete) {
    return NextResponse.json({ error: "غير مصرح لك بحذف الحالات" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.case.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// POST /api/cases/[id]/payments (Add payment)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Permission check: adding payments is a financial edit operation
  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_ADMIN" ||
    session.user.permissions?.canEditCases;
  if (!canEdit) {
    return NextResponse.json({ error: "غير مصرح لك بإضافة مدفوعات" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const amount = parseFloat(body.amount);

  if (isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "المبلغ غير صحيح" }, { status: 400 });
  }

  const caseItem = await prisma.case.findUnique({ where: { id } });
  if (!caseItem) {
    return NextResponse.json({ error: "الحالة غير موجودة" }, { status: 404 });
  }

  const newCollected = caseItem.collected + amount;
  const newRemaining = caseItem.totalAmount - newCollected;

  const [payment, updatedCase] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        caseId: id,
        amount,
        paymentMethod: body.paymentMethod || "CASH",
        courierId: body.courierId || null,
        note: body.note || null,
        createdById: session.user.id,
      },
      include: { courier: { select: { id: true, name: true } } },
    }),
    prisma.case.update({
      where: { id },
      data: {
        collected: newCollected,
        remaining: newRemaining,
      },
      include: {
        doctor: true,
        productType: true,
        payments: {
          orderBy: { paidAt: "desc" },
          include: { courier: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  return NextResponse.json({ payment, case: updatedCase }, { status: 201 });
}
