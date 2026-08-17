import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const appointmentSchema = z.object({
  doctorId: z.string().min(1, "اختر الدكتور"),
  patientName: z.string().optional().nullable(),
  productTypeId: z.string().optional().nullable(),
  units: z.number().optional(),
  pricePerUnit: z.number().optional(),
  color: z.string().optional().nullable(),
  caseId: z.string().optional().nullable(),
  type: z.enum(["PROOF_DELIVERY", "PROOF_RETURN", "CASE_DELIVERY", "CASE_RECEIPT", "CONSULTATION", "OTHER"]),
  scheduledAt: z.string().min(1, "تاريخ ووقت الموعد مطلوب"),
  deliveryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isReceivedAtLab: z.boolean().optional(),
});

// Helper for auto case code: [Day 2 digits][Month 2 digits][Sequence starting at 11]
async function generateCaseCode(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.getMonth() + 1;

  const dayStr = String(day).padStart(2, "0");
  const monthStr = String(month).padStart(2, "0");
  const prefix = `${dayStr}${monthStr}`; // e.g. "2107"

  // Find existing cases starting with this day/month prefix
  const existingCases = await prisma.case.findMany({
    where: { caseCode: { startsWith: prefix } },
    select: { caseCode: true },
  });

  // Calculate highest sequence number starting from 10 (so first is 11)
  let maxSeq = 10;
  for (const c of existingCases) {
    const seqPart = c.caseCode.substring(prefix.length);
    const seqNum = parseInt(seqPart, 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  }

  const nextSeqNum = maxSeq + 1; // 11, 12, 13...
  return `${prefix}${nextSeqNum}`;
}

// GET /api/appointments
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointments = await prisma.appointment.findMany({
    orderBy: { scheduledAt: "asc" },
    include: { doctor: true, case: true },
  });

  return NextResponse.json(appointments);
}

// POST /api/appointments
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && session.user.permissions?.canEditAppointments === false) {
    return NextResponse.json({ error: "ليس لديك صلاحية لحجز أو تسجيل مواعيد" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = appointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const { doctorId, patientName, productTypeId, units, pricePerUnit, color, caseId, type, scheduledAt, deliveryDate, notes, isReceivedAtLab } = parsed.data;

  let createdCaseId = caseId || null;

  // If user checked "Arrived at Lab" OR provided complete case info, automatically register as a Case!
  if (isReceivedAtLab || (patientName && productTypeId)) {
    const autoCode = await generateCaseCode(scheduledAt);
    const u = units || 1;
    const p = pricePerUnit || 0;
    const total = u * p;

    const newCase = await prisma.case.create({
      data: {
        caseCode: autoCode,
        doctorId,
        patientName: patientName || "مريض بدون اسم",
        productTypeId: productTypeId || (await prisma.productType.findFirst({ select: { id: true } }))?.id || "",
        color: color || null,
        units: u,
        pricePerUnit: p,
        totalAmount: total,
        collected: 0,
        remaining: total,
        receivedAt: new Date(scheduledAt),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes: notes || null,
        status: isReceivedAtLab ? "RECEIVED" : "IN_PROGRESS",
      },
    });

    createdCaseId = newCase.id;
  }

  const appointment = await prisma.appointment.create({
    data: {
      doctorId,
      caseId: createdCaseId,
      type,
      scheduledAt: new Date(scheduledAt),
      notes: notes || null,
      isDone: !!isReceivedAtLab,
      doneAt: isReceivedAtLab ? new Date() : null,
    },
    include: { doctor: true, case: true },
  });

  return NextResponse.json(appointment, { status: 201 });
}
