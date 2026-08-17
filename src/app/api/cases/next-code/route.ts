import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/cases/next-code?date=2026-07-21
// Format: [Day 2 digits][Month 2 digits][Sequence starting at 11] (e.g. 210711, 210712, 210713...)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  let day = new Date().getDate();
  let month = new Date().getMonth() + 1;

  if (dateStr && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  }

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
  const caseCode = `${prefix}${nextSeqNum}`;

  return NextResponse.json({ caseCode, prefix, nextSeq: nextSeqNum });
}
