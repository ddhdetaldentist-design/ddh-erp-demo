import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsClient } from "@/components/settings/SettingsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "إعدادات النظام والمستخدمين" };

async function getSettingsData() {
  const session = await auth();
  const userRole = session?.user?.role || "EMPLOYEE";

  // Ensure default roles exist in system
  const defaultRoles = [
    {
      roleName: "أدمن النظام (Admin)",
      description: "صلاحيات كاملة في إدارة الحالات والأطباء والموظفين والماليات والإعدادات",
      canViewCases: true,
      canEditCases: true,
      canDeleteCases: true,
      canManageDoctors: true,
      canManageEmployees: true,
      canManageProducts: true,
      canViewFinance: true,
      canManageExpenses: true,
      canViewReports: true,
      canManageSettings: true,
    },
    {
      roleName: "مشاهد / عرض فقط (Viewer)",
      description: "يمكنه مشاهدة جميع الصفحات والحالات والتقارير دون إمكانية التعديل أو الحذف",
      canViewCases: true,
      canEditCases: false,
      canDeleteCases: false,
      canManageDoctors: false,
      canManageEmployees: false,
      canManageProducts: false,
      canViewFinance: true,
      canManageExpenses: false,
      canViewReports: true,
      canManageSettings: false,
    },
    {
      roleName: "فني المعمل / ديزاين",
      description: "مشاهدة الحالات وتعديل مراحل التصنيع والبروفة فقط",
      canViewCases: true,
      canEditCases: true,
      canDeleteCases: false,
      canManageDoctors: false,
      canManageEmployees: false,
      canManageProducts: false,
      canViewFinance: false,
      canManageExpenses: false,
      canViewReports: false,
      canManageSettings: false,
    },
    {
      roleName: "محاسب / ماليات",
      description: "إدارة التحصيل والمصروفات وعرض التقرير المالي وكشوف الحسابات",
      canViewCases: true,
      canEditCases: true,
      canDeleteCases: false,
      canManageDoctors: false,
      canManageEmployees: false,
      canManageProducts: false,
      canViewFinance: true,
      canManageExpenses: true,
      canViewReports: true,
      canManageSettings: false,
    },
    {
      roleName: "موظف استقبال",
      description: "استلام الحالات والمواعيد وتسجيل بيانات المرضى والأطباء",
      canViewCases: true,
      canEditCases: true,
      canDeleteCases: false,
      canManageDoctors: true,
      canManageEmployees: false,
      canManageProducts: false,
      canViewFinance: false,
      canManageExpenses: false,
      canViewReports: false,
      canManageSettings: false,
    },
  ];

  for (const r of defaultRoles) {
    await prisma.rolePermission.upsert({
      where: { roleName: r.roleName },
      update: {},
      create: r,
    });
  }

  const [
    roles,
    users,
    casesCount,
    doctorsCount,
    productsCount,
    paymentsCount,
    expensesCount,
    employeesCount,
    appointmentsCount,
    usersCount,
  ] = await Promise.all([
    prisma.rolePermission.findMany({
      orderBy: { createdAt: "asc" },
      include: { users: { select: { id: true, name: true, email: true } } },
    }),
    prisma.user.findMany({
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
    }),
    prisma.case.count(),
    prisma.doctor.count(),
    prisma.productType.count(),
    prisma.payment.count(),
    prisma.expense.count(),
    prisma.employee.count(),
    prisma.appointment.count(),
    prisma.user.count(),
  ]);

  const stats = {
    casesCount,
    doctorsCount,
    productsCount,
    paymentsCount,
    expensesCount,
    employeesCount,
    appointmentsCount,
    usersCount,
  };

  return { roles, users, userRole, stats };
}

export default async function SettingsPage() {
  const { roles, users, userRole, stats } = await getSettingsData();

  return (
    <>
      <Topbar
        title="إعدادات النظام والنسخ الاحتياطي"
        subtitle="إدارة المستخدمين والأدوار والنسخ الاحتياطي واستعادة البيانات"
      />

      <div className="flex-1 p-6 space-y-6 page-enter">
        <SettingsClient initialRoles={roles} initialUsers={users} userRole={userRole} stats={stats} />
      </div>
    </>
  );
}
