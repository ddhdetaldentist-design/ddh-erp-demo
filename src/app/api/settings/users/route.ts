import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/settings/users
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only Admins or users with canManageSettings can list users
  const canAccess =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_ADMIN" ||
    session.user.permissions?.canManageSettings;
  if (!canAccess) {
    return NextResponse.json({ error: "غير مصرح لك بعرض قائمة المستخدمين" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rolePermissionId: true,
      rolePermission: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

// POST /api/settings/users (Create new user with assigned role)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "فقط الأدمن يمكنه إضافة مستخدمين جدد" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, phone, rolePermissionId, role } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "الاسم والبريد السري وكلمة المرور مطلوبة" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role: role || "CUSTOM",
      rolePermissionId: rolePermissionId || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rolePermissionId: true,
      rolePermission: true,
      phone: true,
      isActive: true,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}
