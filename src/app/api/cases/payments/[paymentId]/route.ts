import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/cases/payments/[paymentId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canEdit =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_ADMIN" ||
    session.user.permissions?.canEditCases;
  if (!canEdit) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل المدفوعات" }, { status: 403 });
  }

  const { paymentId } = await params;
  const body = await req.json();
  const { amount, paymentMethod, note } = body;

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "المبلغ غير صحيح" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, amount: true, caseId: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "الدفعة غير موجودة" }, { status: 404 });
  }

  const amountDiff = parsedAmount - payment.amount;

  // Update payment + recalculate case collected/remaining in a transaction
  const [, updatedCase] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        amount: parsedAmount,
        paymentMethod: paymentMethod || "CASH",
        note: note ?? null,
      },
    }),
    prisma.case.update({
      where: { id: payment.caseId },
      data: {
        collected: { increment: amountDiff },
        remaining: { decrement: amountDiff },
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

  return NextResponse.json({ case: updatedCase });
}
