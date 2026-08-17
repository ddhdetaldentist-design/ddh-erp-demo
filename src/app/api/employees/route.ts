import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const employeeSchema = z.object({
  name: z.string().min(1, "اسم الموظف مطلوب"),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  baseSalary: z.number().optional(),
});

// GET /api/employees
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(employees);
}

// POST /api/employees
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManage = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || session.user.permissions?.canManageEmployees;
  if (!canManage) {
    return NextResponse.json({ error: "غير مصرح لك بإضافة موظفين جدد" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      name: parsed.data.name,
      jobTitle: parsed.data.jobTitle || null,
      phone: parsed.data.phone || null,
      baseSalary: parsed.data.baseSalary || 0,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
