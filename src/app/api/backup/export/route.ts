import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح بالدخول" }, { status: 401 });
    }

    const isSuperOrAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    const canManageSettings = session.user.permissions?.canManageSettings;

    if (!isSuperOrAdmin && !canManageSettings) {
      return NextResponse.json({ error: "ليست لديك صلاحية لتصدير النسخة الاحتياطية" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get("type") || "excel"; // excel | sql | json

    // Fetch all database records
    const [
      cases,
      doctors,
      productTypes,
      payments,
      expenses,
      employees,
      appointments,
      remittances,
      transfers,
      users,
      rolePermissions,
      auditLogs,
    ] = await Promise.all([
      prisma.case.findMany({
        include: { doctor: true, productType: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.doctor.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.productType.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.payment.findMany({
        include: { case: true, courier: true, createdBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.expense.findMany({
        include: { employee: true, doctor: true, createdBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.employee.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.appointment.findMany({
        include: { doctor: true, case: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.courierRemittance.findMany({
        include: { employee: true, createdBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.fundTransfer.findMany({
        include: { createdBy: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
          rolePermission: { select: { roleName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.rolePermission.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.auditLog.findMany({
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
    ]);

    const dateStr = new Date().toISOString().split("T")[0];

    // ─── 1. EXCEL FORMAT (.xlsx) ─────────────────────────────────────────────
    if (formatType === "excel") {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Cases
      const casesSheet = cases.map((c) => ({
        "كود الحالة": c.caseCode,
        "رقم أوردر الشغل": c.workOrderNumber || "-",
        "اسم المريض": c.patientName,
        "الطبيب": c.doctor?.name || "-",
        "نوع التركيبة": c.productType?.name || "-",
        "اللون": c.color || "-",
        "عدد الوحدات": c.units,
        "سعر الوحدة": c.pricePerUnit,
        "الإجمالي": c.totalAmount,
        "المحصل": c.collected,
        "المتبقي": c.remaining,
        "الحالة": c.status,
        "تاريخ الاستلام": c.receivedAt ? new Date(c.receivedAt).toISOString().split("T")[0] : "-",
        "تاريخ البروفة ذهاب": c.proofSentAt ? new Date(c.proofSentAt).toISOString().split("T")[0] : "-",
        "تاريخ البروفة عودة": c.proofReturnedAt ? new Date(c.proofReturnedAt).toISOString().split("T")[0] : "-",
        "تاريخ التسليم المقرر": c.deliveryDate ? new Date(c.deliveryDate).toISOString().split("T")[0] : "-",
        "تاريخ التسليم الفعلي": c.deliveredAt ? new Date(c.deliveredAt).toISOString().split("T")[0] : "-",
        "ملاحظات": c.notes || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(casesSheet), "الحالات");

      // Sheet 2: Doctors
      const doctorsSheet = doctors.map((d) => ({
        "ID": d.id,
        "اسم الطبيب": d.name,
        "الهاتف": d.phone || "-",
        "اسم العيادة": d.clinicName || "-",
        "المنطقة": d.area || "-",
        "الإيميل": d.email || "-",
        "ملاحظات": d.notes || "-",
        "نشط": d.isActive ? "نعم" : "لا",
        "تاريخ التسجيل": new Date(d.createdAt).toISOString().split("T")[0],
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(doctorsSheet), "الأطباء");

      // Sheet 3: Products
      const productsSheet = productTypes.map((p) => ({
        "ID": p.id,
        "اسم الصنف": p.name,
        "الاسم بالعربي": p.nameAr || "-",
        "السعر الأساسي": p.basePrice,
        "الوصف": p.description || "-",
        "نشط": p.isActive ? "نعم" : "لا",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productsSheet), "التركيبات والمنتجات");

      // Sheet 4: Payments
      const paymentsSheet = payments.map((p) => ({
        "ID": p.id,
        "كود الحالة": p.case?.caseCode || "-",
        "اسم المريض": p.case?.patientName || "-",
        "المبلغ المحصل": p.amount,
        "طريقة الدفع": p.paymentMethod,
        "اسم المندوب": p.courier?.name || "-",
        "تاريخ التحصيل": new Date(p.paidAt).toISOString().split("T")[0],
        "بواسطة": p.createdBy?.name || "-",
        "ملاحظات": p.note || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsSheet), "المقبوضات والتحصيلات");

      // Sheet 5: Expenses
      const expensesSheet = expenses.map((e) => ({
        "ID": e.id,
        "التاريخ": new Date(e.date).toISOString().split("T")[0],
        "البيان / الوصف": e.description,
        "المبلغ": e.amount,
        "التصنيف": e.category,
        "طريقة الدفع": e.paymentMethod,
        "الموظف": e.employee?.name || "-",
        "الطبيب": e.doctor?.name || "-",
        "الشهر": e.month,
        "السنة": e.year,
        "سجل بواسطة": e.createdBy?.name || "-",
        "ملاحظات": e.notes || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesSheet), "المصروفات");

      // Sheet 6: Employees
      const employeesSheet = employees.map((emp) => ({
        "ID": emp.id,
        "اسم الموظف": emp.name,
        "الوظيفة": emp.jobTitle || "-",
        "الهاتف": emp.phone || "-",
        "الراتب الأساسي": emp.baseSalary ?? "-",
        "تاريخ البدء": emp.startDate ? new Date(emp.startDate).toISOString().split("T")[0] : "-",
        "نشط": emp.isActive ? "نعم" : "لا",
        "ملاحظات": emp.notes || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employeesSheet), "الموظفون");

      // Sheet 7: Appointments
      const appointmentsSheet = appointments.map((a) => ({
        "ID": a.id,
        "الطبيب": a.doctor?.name || "-",
        "كود الحالة": a.case?.caseCode || "-",
        "النوع": a.type,
        "الموعد المحدد": new Date(a.scheduledAt).toLocaleString("ar-EG"),
        "تم التنفيذ": a.isDone ? "نعم" : "لا",
        "ملاحظات": a.notes || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appointmentsSheet), "المواعيد والزيارات");

      // Sheet 8: Remittances
      const remittancesSheet = remittances.map((r) => ({
        "ID": r.id,
        "المندوب": r.employee?.name || "-",
        "المبلغ المورد": r.amount,
        "طريقة الدفع": r.paymentMethod,
        "تاريخ التوريد": new Date(r.date).toISOString().split("T")[0],
        "الشهر": r.month,
        "السنة": r.year,
        "سجل بواسطة": r.createdBy?.name || "-",
        "ملاحظات": r.notes || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(remittancesSheet), "توريدات المندوبين");

      // Sheet 9: Fund Transfers
      const transfersSheet = transfers.map((t) => ({
        "ID": t.id,
        "من حساب / طريقة": t.fromMethod,
        "إلى حساب / طريقة": t.toMethod,
        "المبلغ": t.amount,
        "التاريخ": new Date(t.date).toISOString().split("T")[0],
        "الشهر": t.month,
        "السنة": t.year,
        "سجل بواسطة": t.createdBy?.name || "-",
        "ملاحظات": t.notes || "-",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transfersSheet), "تحويلات الخزن");

      // Sheet 10: Users
      const usersSheet = users.map((u) => ({
        "ID": u.id,
        "الاسم": u.name,
        "الإيميل": u.email,
        "الهاتف": u.phone || "-",
        "الرول": u.role,
        "الصلاحية": u.rolePermission?.roleName || "-",
        "نشط": u.isActive ? "نعم" : "لا",
        "تاريخ الإنشاء": new Date(u.createdAt).toISOString().split("T")[0],
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersSheet), "المستخدمون");

      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="DDH-ERP-Full-Backup-${dateStr}.xlsx"`,
        },
      });
    }

    // ─── 2. SQL DUMP FORMAT (.sql) ───────────────────────────────────────────
    if (formatType === "sql") {
      const escapeSqlString = (str: string | null | undefined) => {
        if (str === null || str === undefined) return "NULL";
        return `'${String(str).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
      };

      const escapeSqlDate = (dateVal: Date | null | undefined) => {
        if (!dateVal) return "NULL";
        return `'${new Date(dateVal).toISOString()}'`;
      };

      const escapeSqlNum = (val: number | null | undefined) => {
        if (val === null || val === undefined || isNaN(val)) return "NULL";
        return val;
      };

      const escapeSqlBool = (val: boolean | null | undefined) => {
        if (val === null || val === undefined) return "NULL";
        return val ? "TRUE" : "FALSE";
      };

      const escapeSqlArray = (arr: number[] | null | undefined) => {
        if (!arr || arr.length === 0) return "ARRAY[]::integer[]";
        return `ARRAY[${arr.join(",")}]::integer[]`;
      };

      let sql = `-- DDH Dental Lab ERP — PostgreSQL Database Dump\n`;
      sql += `-- Generated At: ${new Date().toISOString()}\n`;
      sql += `-- Total Entities: Cases=${cases.length}, Doctors=${doctors.length}, Products=${productTypes.length}, Payments=${payments.length}, Expenses=${expenses.length}\n\n`;
      sql += `BEGIN;\n\n`;

      // Product Types
      sql += `-- Table: product_types\n`;
      for (const p of productTypes) {
        sql += `INSERT INTO "product_types" ("id", "name", "nameAr", "basePrice", "description", "isActive", "createdAt", "updatedAt") VALUES (${escapeSqlString(p.id)}, ${escapeSqlString(p.name)}, ${escapeSqlString(p.nameAr)}, ${escapeSqlNum(p.basePrice)}, ${escapeSqlString(p.description)}, ${escapeSqlBool(p.isActive)}, ${escapeSqlDate(p.createdAt)}, ${escapeSqlDate(p.updatedAt)}) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "basePrice" = EXCLUDED."basePrice", "updatedAt" = EXCLUDED."updatedAt";\n`;
      }

      // Doctors
      sql += `\n-- Table: doctors\n`;
      for (const d of doctors) {
        sql += `INSERT INTO "doctors" ("id", "name", "phone", "clinicName", "area", "email", "notes", "isActive", "createdAt", "updatedAt") VALUES (${escapeSqlString(d.id)}, ${escapeSqlString(d.name)}, ${escapeSqlString(d.phone)}, ${escapeSqlString(d.clinicName)}, ${escapeSqlString(d.area)}, ${escapeSqlString(d.email)}, ${escapeSqlString(d.notes)}, ${escapeSqlBool(d.isActive)}, ${escapeSqlDate(d.createdAt)}, ${escapeSqlDate(d.updatedAt)}) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "phone" = EXCLUDED."phone", "updatedAt" = EXCLUDED."updatedAt";\n`;
      }

      // Employees
      sql += `\n-- Table: employees\n`;
      for (const emp of employees) {
        sql += `INSERT INTO "employees" ("id", "name", "jobTitle", "phone", "baseSalary", "startDate", "isActive", "notes", "createdAt", "updatedAt") VALUES (${escapeSqlString(emp.id)}, ${escapeSqlString(emp.name)}, ${escapeSqlString(emp.jobTitle)}, ${escapeSqlString(emp.phone)}, ${escapeSqlNum(emp.baseSalary)}, ${escapeSqlDate(emp.startDate)}, ${escapeSqlBool(emp.isActive)}, ${escapeSqlString(emp.notes)}, ${escapeSqlDate(emp.createdAt)}, ${escapeSqlDate(emp.updatedAt)}) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "updatedAt" = EXCLUDED."updatedAt";\n`;
      }

      // Role Permissions
      sql += `\n-- Table: role_permissions\n`;
      for (const rp of rolePermissions) {
        sql += `INSERT INTO "role_permissions" ("id", "roleName", "description", "canViewCases", "canEditCases", "canDeleteCases", "canViewDoctors", "canManageDoctors", "canDeleteDoctors", "canViewEmployees", "canManageEmployees", "canDeleteEmployees", "canViewCouriers", "canManageCouriers", "canDeleteCouriers", "canViewProducts", "canManageProducts", "canDeleteProducts", "canViewAppointments", "canEditAppointments", "canDeleteAppointments", "canViewFinance", "canManageExpenses", "canDeleteExpenses", "canViewReports", "canManageSettings", "createdAt", "updatedAt") VALUES (${escapeSqlString(rp.id)}, ${escapeSqlString(rp.roleName)}, ${escapeSqlString(rp.description)}, ${escapeSqlBool(rp.canViewCases)}, ${escapeSqlBool(rp.canEditCases)}, ${escapeSqlBool(rp.canDeleteCases)}, ${escapeSqlBool(rp.canViewDoctors)}, ${escapeSqlBool(rp.canManageDoctors)}, ${escapeSqlBool(rp.canDeleteDoctors)}, ${escapeSqlBool(rp.canViewEmployees)}, ${escapeSqlBool(rp.canManageEmployees)}, ${escapeSqlBool(rp.canDeleteEmployees)}, ${escapeSqlBool(rp.canViewCouriers)}, ${escapeSqlBool(rp.canManageCouriers)}, ${escapeSqlBool(rp.canDeleteCouriers)}, ${escapeSqlBool(rp.canViewProducts)}, ${escapeSqlBool(rp.canManageProducts)}, ${escapeSqlBool(rp.canDeleteProducts)}, ${escapeSqlBool(rp.canViewAppointments)}, ${escapeSqlBool(rp.canEditAppointments)}, ${escapeSqlBool(rp.canDeleteAppointments)}, ${escapeSqlBool(rp.canViewFinance)}, ${escapeSqlBool(rp.canManageExpenses)}, ${escapeSqlBool(rp.canDeleteExpenses)}, ${escapeSqlBool(rp.canViewReports)}, ${escapeSqlBool(rp.canManageSettings)}, ${escapeSqlDate(rp.createdAt)}, ${escapeSqlDate(rp.updatedAt)}) ON CONFLICT ("id") DO NOTHING;\n`;
      }

      // Cases
      sql += `\n-- Table: cases\n`;
      for (const c of cases) {
        sql += `INSERT INTO "cases" ("id", "caseCode", "workOrderNumber", "doctorId", "patientName", "productTypeId", "color", "units", "pricePerUnit", "totalAmount", "collected", "remaining", "receivedAt", "proofSentAt", "proofReturnedAt", "deliveryDate", "deliveredAt", "status", "notes", "teethMap", "marginDone", "latheeDone", "glazeDone", "designDone", "createdAt", "updatedAt") VALUES (${escapeSqlString(c.id)}, ${escapeSqlString(c.caseCode)}, ${escapeSqlString(c.workOrderNumber)}, ${escapeSqlString(c.doctorId)}, ${escapeSqlString(c.patientName)}, ${escapeSqlString(c.productTypeId)}, ${escapeSqlString(c.color)}, ${escapeSqlNum(c.units)}, ${escapeSqlNum(c.pricePerUnit)}, ${escapeSqlNum(c.totalAmount)}, ${escapeSqlNum(c.collected)}, ${escapeSqlNum(c.remaining)}, ${escapeSqlDate(c.receivedAt)}, ${escapeSqlDate(c.proofSentAt)}, ${escapeSqlDate(c.proofReturnedAt)}, ${escapeSqlDate(c.deliveryDate)}, ${escapeSqlDate(c.deliveredAt)}, ${escapeSqlString(c.status)}::"CaseStatus", ${escapeSqlString(c.notes)}, ${escapeSqlArray(c.teethMap)}, ${escapeSqlBool(c.marginDone)}, ${escapeSqlBool(c.latheeDone)}, ${escapeSqlBool(c.glazeDone)}, ${escapeSqlBool(c.designDone)}, ${escapeSqlDate(c.createdAt)}, ${escapeSqlDate(c.updatedAt)}) ON CONFLICT ("id") DO UPDATE SET "caseCode" = EXCLUDED."caseCode", "totalAmount" = EXCLUDED."totalAmount", "collected" = EXCLUDED."collected", "remaining" = EXCLUDED."remaining", "updatedAt" = EXCLUDED."updatedAt";\n`;
      }

      // Payments
      sql += `\n-- Table: payments\n`;
      for (const p of payments) {
        sql += `INSERT INTO "payments" ("id", "caseId", "amount", "paymentMethod", "courierId", "paidAt", "note", "createdById", "createdAt") VALUES (${escapeSqlString(p.id)}, ${escapeSqlString(p.caseId)}, ${escapeSqlNum(p.amount)}, ${escapeSqlString(p.paymentMethod)}, ${escapeSqlString(p.courierId)}, ${escapeSqlDate(p.paidAt)}, ${escapeSqlString(p.note)}, ${escapeSqlString(p.createdById)}, ${escapeSqlDate(p.createdAt)}) ON CONFLICT ("id") DO NOTHING;\n`;
      }

      // Expenses
      sql += `\n-- Table: expenses\n`;
      for (const e of expenses) {
        sql += `INSERT INTO "expenses" ("id", "date", "description", "amount", "category", "paymentMethod", "month", "year", "employeeId", "doctorId", "createdById", "notes", "createdAt", "updatedAt") VALUES (${escapeSqlString(e.id)}, ${escapeSqlDate(e.date)}, ${escapeSqlString(e.description)}, ${escapeSqlNum(e.amount)}, ${escapeSqlString(e.category)}::"ExpenseCategory", ${escapeSqlString(e.paymentMethod)}, ${escapeSqlNum(e.month)}, ${escapeSqlNum(e.year)}, ${escapeSqlString(e.employeeId)}, ${escapeSqlString(e.doctorId)}, ${escapeSqlString(e.createdById)}, ${escapeSqlString(e.notes)}, ${escapeSqlDate(e.createdAt)}, ${escapeSqlDate(e.updatedAt)}) ON CONFLICT ("id") DO NOTHING;\n`;
      }

      // Remittances
      sql += `\n-- Table: courier_remittances\n`;
      for (const r of remittances) {
        sql += `INSERT INTO "courier_remittances" ("id", "employeeId", "amount", "paymentMethod", "date", "month", "year", "notes", "createdById", "createdAt", "updatedAt") VALUES (${escapeSqlString(r.id)}, ${escapeSqlString(r.employeeId)}, ${escapeSqlNum(r.amount)}, ${escapeSqlString(r.paymentMethod)}, ${escapeSqlDate(r.date)}, ${escapeSqlNum(r.month)}, ${escapeSqlNum(r.year)}, ${escapeSqlString(r.notes)}, ${escapeSqlString(r.createdById)}, ${escapeSqlDate(r.createdAt)}, ${escapeSqlDate(r.updatedAt)}) ON CONFLICT ("id") DO NOTHING;\n`;
      }

      // Fund Transfers
      sql += `\n-- Table: fund_transfers\n`;
      for (const t of transfers) {
        sql += `INSERT INTO "fund_transfers" ("id", "fromMethod", "toMethod", "amount", "date", "month", "year", "notes", "createdById", "createdAt", "updatedAt") VALUES (${escapeSqlString(t.id)}, ${escapeSqlString(t.fromMethod)}, ${escapeSqlString(t.toMethod)}, ${escapeSqlNum(t.amount)}, ${escapeSqlDate(t.date)}, ${escapeSqlNum(t.month)}, ${escapeSqlNum(t.year)}, ${escapeSqlString(t.notes)}, ${escapeSqlString(t.createdById)}, ${escapeSqlDate(t.createdAt)}, ${escapeSqlDate(t.updatedAt)}) ON CONFLICT ("id") DO NOTHING;\n`;
      }

      sql += `\nCOMMIT;\n`;

      return new NextResponse(sql, {
        status: 200,
        headers: {
          "Content-Type": "application/sql; charset=utf-8",
          "Content-Disposition": `attachment; filename="DDH-ERP-PostgreSQL-Backup-${dateStr}.sql"`,
        },
      });
    }

    // ─── 3. JSON BACKUP FORMAT (.json) ───────────────────────────────────────
    const jsonBackup = {
      app: "DDH Dental Lab ERP",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      counts: {
        cases: cases.length,
        doctors: doctors.length,
        productTypes: productTypes.length,
        payments: payments.length,
        expenses: expenses.length,
        employees: employees.length,
        appointments: appointments.length,
        remittances: remittances.length,
        transfers: transfers.length,
        users: users.length,
        rolePermissions: rolePermissions.length,
      },
      data: {
        productTypes,
        doctors,
        employees,
        rolePermissions,
        users,
        cases,
        payments,
        expenses,
        appointments,
        remittances,
        transfers,
      },
    };

    return new NextResponse(JSON.stringify(jsonBackup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="DDH-ERP-Backup-${dateStr}.json"`,
      },
    });
  } catch (error: unknown) {
    console.error("Backup export error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنتاج النسخة الاحتياطية", details: (error as Error).message },
      { status: 500 }
    );
  }
}
