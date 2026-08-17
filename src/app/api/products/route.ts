import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "اسم التركيبة كود مطلوب"),
  nameAr: z.string().optional(),
  basePrice: z.number().min(0),
  description: z.string().optional(),
});

// GET /api/products
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.productType.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

// POST /api/products
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  if (!isSuperOrAdmin && !session.user.permissions?.canManageProducts) {
    return NextResponse.json({ error: "ليس لديك صلاحية لإضافة أنواع التركيبات" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const existing = await prisma.productType.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    return NextResponse.json({ error: "نوع التركيبة موجود بالفعل" }, { status: 409 });
  }

  const product = await prisma.productType.create({
    data: {
      name: parsed.data.name,
      nameAr: parsed.data.nameAr || null,
      basePrice: parsed.data.basePrice,
      description: parsed.data.description || null,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
