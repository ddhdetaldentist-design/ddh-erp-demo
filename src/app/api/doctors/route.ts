import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const doctorSchema = z.object({
  name: z.string().min(1, "اسم الدكتور مطلوب"),
  phone: z.string().optional(),
  clinicName: z.string().optional(),
  area: z.string().optional(),
});

// GET /api/doctors
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctors = await prisma.doctor.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(doctors);
}

// POST /api/doctors
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canManageDoctors;
  if (!canManage) {
    return NextResponse.json({ error: "غير مصرح لك بإضافة الأطباء" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = doctorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const doctor = await prisma.doctor.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      clinicName: parsed.data.clinicName || null,
      area: parsed.data.area || null,
    },
  });

  return NextResponse.json(doctor, { status: 201 });
}
