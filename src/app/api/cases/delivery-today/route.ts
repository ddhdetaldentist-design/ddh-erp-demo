import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canView =
    session.user.role === "ADMIN" ||
    session.user.role === "SUPER_ADMIN" ||
    (session.user.permissions?.canViewCases ?? true);

  if (!canView) {
    return NextResponse.json({ error: "غير مصرح لك بعرض الحالات" }, { status: 403 });
  }

  // Get start and end of current local day
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  try {
    const cases = await prisma.case.findMany({
      where: {
        deliveryDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        doctor: true,
        productType: true,
      },
      orderBy: {
        deliveryDate: "asc",
      },
    });

    return NextResponse.json(cases);
  } catch (error) {
    console.error("Error fetching today's deliveries:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب الحالات" }, { status: 500 });
  }
}
