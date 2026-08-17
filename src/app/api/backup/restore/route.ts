import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح بالدخول" }, { status: 401 });
    }

    const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    if (!isSuperOrAdmin) {
      return NextResponse.json({ error: "فقط مدير النظام يمكنه استرجاع النسخ الاحتياطية" }, { status: 403 });
    }

    const body = await request.json();
    const data = body.data || body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "ملف النسخة الاحتياطية غير صالح أو فارغ" }, { status: 400 });
    }

    let restoredCounts = {
      productTypes: 0,
      doctors: 0,
      employees: 0,
      rolePermissions: 0,
      cases: 0,
      payments: 0,
      expenses: 0,
      appointments: 0,
      remittances: 0,
      transfers: 0,
    };

    // 1. Restore Product Types
    if (Array.isArray(data.productTypes)) {
      for (const item of data.productTypes) {
        if (!item.id || !item.name) continue;
        await prisma.productType.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            nameAr: item.nameAr || null,
            basePrice: Number(item.basePrice) || 0,
            description: item.description || null,
            isActive: item.isActive ?? true,
          },
          create: {
            id: item.id,
            name: item.name,
            nameAr: item.nameAr || null,
            basePrice: Number(item.basePrice) || 0,
            description: item.description || null,
            isActive: item.isActive ?? true,
          },
        });
        restoredCounts.productTypes++;
      }
    }

    // 2. Restore Doctors
    if (Array.isArray(data.doctors)) {
      for (const item of data.doctors) {
        if (!item.id || !item.name) continue;
        await prisma.doctor.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            phone: item.phone || null,
            clinicName: item.clinicName || null,
            area: item.area || null,
            email: item.email || null,
            notes: item.notes || null,
            isActive: item.isActive ?? true,
          },
          create: {
            id: item.id,
            name: item.name,
            phone: item.phone || null,
            clinicName: item.clinicName || null,
            area: item.area || null,
            email: item.email || null,
            notes: item.notes || null,
            isActive: item.isActive ?? true,
          },
        });
        restoredCounts.doctors++;
      }
    }

    // 3. Restore Employees
    if (Array.isArray(data.employees)) {
      for (const item of data.employees) {
        if (!item.id || !item.name) continue;
        await prisma.employee.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            jobTitle: item.jobTitle || null,
            phone: item.phone || null,
            baseSalary: item.baseSalary ? Number(item.baseSalary) : null,
            startDate: item.startDate ? new Date(item.startDate) : null,
            isActive: item.isActive ?? true,
            notes: item.notes || null,
          },
          create: {
            id: item.id,
            name: item.name,
            jobTitle: item.jobTitle || null,
            phone: item.phone || null,
            baseSalary: item.baseSalary ? Number(item.baseSalary) : null,
            startDate: item.startDate ? new Date(item.startDate) : null,
            isActive: item.isActive ?? true,
            notes: item.notes || null,
          },
        });
        restoredCounts.employees++;
      }
    }

    // 4. Restore Cases
    if (Array.isArray(data.cases)) {
      for (const item of data.cases) {
        if (!item.id || !item.caseCode || !item.doctorId || !item.productTypeId) continue;
        await prisma.case.upsert({
          where: { id: item.id },
          update: {
            caseCode: item.caseCode,
            workOrderNumber: item.workOrderNumber || null,
            doctorId: item.doctorId,
            patientName: item.patientName,
            productTypeId: item.productTypeId,
            color: item.color || null,
            units: Number(item.units) || 1,
            pricePerUnit: Number(item.pricePerUnit) || 0,
            totalAmount: Number(item.totalAmount) || 0,
            collected: Number(item.collected) || 0,
            remaining: Number(item.remaining) || 0,
            status: item.status || "RECEIVED",
            notes: item.notes || null,
            teethMap: Array.isArray(item.teethMap) ? item.teethMap : [],
            marginDone: item.marginDone ?? false,
            latheeDone: item.latheeDone ?? false,
            glazeDone: item.glazeDone ?? false,
            designDone: item.designDone ?? false,
            receivedAt: item.receivedAt ? new Date(item.receivedAt) : new Date(),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            deliveredAt: item.deliveredAt ? new Date(item.deliveredAt) : null,
          },
          create: {
            id: item.id,
            caseCode: item.caseCode,
            workOrderNumber: item.workOrderNumber || null,
            doctorId: item.doctorId,
            patientName: item.patientName,
            productTypeId: item.productTypeId,
            color: item.color || null,
            units: Number(item.units) || 1,
            pricePerUnit: Number(item.pricePerUnit) || 0,
            totalAmount: Number(item.totalAmount) || 0,
            collected: Number(item.collected) || 0,
            remaining: Number(item.remaining) || 0,
            status: item.status || "RECEIVED",
            notes: item.notes || null,
            teethMap: Array.isArray(item.teethMap) ? item.teethMap : [],
            marginDone: item.marginDone ?? false,
            latheeDone: item.latheeDone ?? false,
            glazeDone: item.glazeDone ?? false,
            designDone: item.designDone ?? false,
            receivedAt: item.receivedAt ? new Date(item.receivedAt) : new Date(),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            deliveredAt: item.deliveredAt ? new Date(item.deliveredAt) : null,
          },
        });
        restoredCounts.cases++;
      }
    }

    // 5. Restore Payments
    if (Array.isArray(data.payments)) {
      for (const item of data.payments) {
        if (!item.id || !item.caseId) continue;
        await prisma.payment.upsert({
          where: { id: item.id },
          update: {
            caseId: item.caseId,
            amount: Number(item.amount) || 0,
            paymentMethod: item.paymentMethod || "CASH",
            courierId: item.courierId || null,
            paidAt: item.paidAt ? new Date(item.paidAt) : new Date(),
            note: item.note || null,
          },
          create: {
            id: item.id,
            caseId: item.caseId,
            amount: Number(item.amount) || 0,
            paymentMethod: item.paymentMethod || "CASH",
            courierId: item.courierId || null,
            paidAt: item.paidAt ? new Date(item.paidAt) : new Date(),
            note: item.note || null,
          },
        });
        restoredCounts.payments++;
      }
    }

    // 6. Restore Expenses
    if (Array.isArray(data.expenses)) {
      for (const item of data.expenses) {
        if (!item.id || !item.description) continue;
        await prisma.expense.upsert({
          where: { id: item.id },
          update: {
            date: item.date ? new Date(item.date) : new Date(),
            description: item.description,
            amount: Number(item.amount) || 0,
            category: item.category || "OTHER",
            paymentMethod: item.paymentMethod || "CASH",
            month: Number(item.month) || new Date().getMonth() + 1,
            year: Number(item.year) || new Date().getFullYear(),
            employeeId: item.employeeId || null,
            doctorId: item.doctorId || null,
            notes: item.notes || null,
          },
          create: {
            id: item.id,
            date: item.date ? new Date(item.date) : new Date(),
            description: item.description,
            amount: Number(item.amount) || 0,
            category: item.category || "OTHER",
            paymentMethod: item.paymentMethod || "CASH",
            month: Number(item.month) || new Date().getMonth() + 1,
            year: Number(item.year) || new Date().getFullYear(),
            employeeId: item.employeeId || null,
            doctorId: item.doctorId || null,
            notes: item.notes || null,
          },
        });
        restoredCounts.expenses++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "تم استرجاع واستيراد النسخة الاحتياطية بنجاح ✓",
      counts: restoredCounts,
    });
  } catch (error: unknown) {
    console.error("Backup restore error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء استرجاع البيانات", details: (error as Error).message },
      { status: 500 }
    );
  }
}
