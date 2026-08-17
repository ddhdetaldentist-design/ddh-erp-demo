"use client";

import { useState } from "react";
import { BackupSection, DatabaseStats } from "./BackupSection";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  UserCheck,
  UserPlus,
  Users,
  Stethoscope,
  Package,
  Wallet,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  Lock,
  Phone,
  CheckCircle2,
  X,
  Truck,
  Calendar,
  Eye,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RolePermission {
  id: string;
  roleName: string;
  description: string | null;

  canViewCases: boolean;
  canEditCases: boolean;
  canDeleteCases: boolean;

  canViewDoctors: boolean;
  canManageDoctors: boolean;
  canDeleteDoctors: boolean;

  canViewEmployees: boolean;
  canManageEmployees: boolean;
  canDeleteEmployees: boolean;

  canViewCouriers: boolean;
  canManageCouriers: boolean;
  canDeleteCouriers: boolean;

  canViewProducts: boolean;
  canManageProducts: boolean;
  canDeleteProducts: boolean;

  canViewAppointments: boolean;
  canEditAppointments: boolean;
  canDeleteAppointments: boolean;

  canViewFinance: boolean;
  canManageExpenses: boolean;
  canDeleteExpenses: boolean;

  canViewReports: boolean;
  canManageSettings: boolean;
  users?: { id: string; name: string; email: string }[];
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  rolePermissionId: string | null;
  rolePermission: RolePermission | null;
  phone: string | null;
  isActive: boolean;
}

interface SettingsClientProps {
  initialRoles: RolePermission[];
  initialUsers: UserItem[];
  userRole: string;
  stats?: DatabaseStats;
}

export function SettingsClient({ initialRoles, initialUsers, userRole, stats }: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "backup">("users");

  const [roles, setRoles] = useState<RolePermission[]>(initialRoles);
  const [users, setUsers] = useState<UserItem[]>(initialUsers);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [showAddRoleModal, setShowAddRoleModal] = useState(false);

  const [expandedRoleIds, setExpandedRoleIds] = useState<string[]>(initialRoles.map(r => r.id));
  const [savingUser, setSavingUser] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  // Form states
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    rolePermissionId: initialRoles[0]?.id || "",
  });

  const [newRoleForm, setNewRoleForm] = useState({
    roleName: "",
    description: "",

    canViewCases: true,
    canEditCases: true,
    canDeleteCases: false,

    canViewDoctors: true,
    canManageDoctors: false,
    canDeleteDoctors: false,

    canViewEmployees: true,
    canManageEmployees: false,
    canDeleteEmployees: false,

    canViewCouriers: true,
    canManageCouriers: false,
    canDeleteCouriers: false,

    canViewProducts: true,
    canManageProducts: false,
    canDeleteProducts: false,

    canViewAppointments: true,
    canEditAppointments: true,
    canDeleteAppointments: false,

    canViewFinance: false,
    canManageExpenses: false,
    canDeleteExpenses: false,

    canViewReports: false,
    canManageSettings: false,
  });

  // Open Add User Modal
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      rolePermissionId: roles[0]?.id || "",
    });
    setShowAddUserModal(true);
  };

  // Open Edit User Modal
  const openEditUserModal = (user: UserItem) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "", // leave empty unless changing
      phone: user.phone || "",
      rolePermissionId: user.rolePermissionId || roles[0]?.id || "",
    });
    setShowAddUserModal(true);
  };

  // Delete User Handler
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!isAdmin) return;
    if (!confirm(`هل أنت تأكد من حذف حساب المستخدم (${userName}) نهائياً؟`)) return;

    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل حذف المستخدم");
        return;
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success("تم حذف حساب المستخدم بنجاح ✓");
      router.refresh();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  // Toggle role card collapse
  const toggleRoleExpand = (id: string) => {
    setExpandedRoleIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Change User Assigned Role via Dropdown
  const handleUserRoleChange = async (userId: string, rolePermissionId: string) => {
    if (!isAdmin) {
      toast.error("فقط الأدمن يمكنه تغيير أدوار المستخدمين");
      return;
    }

    const selectedRole = roles.find(r => r.id === rolePermissionId);
    setUpdatingUserId(userId);

    // Optimistic UI update
    setUsers(prev => prev.map(u => u.id === userId ? {
      ...u,
      rolePermissionId,
      rolePermission: selectedRole || null,
      role: selectedRole?.roleName.includes("أدمن") ? "ADMIN" : "CUSTOM",
    } : u));

    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rolePermissionId,
          role: selectedRole?.roleName.includes("أدمن") ? "ADMIN" : "CUSTOM",
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("تم تحديث دور المستخدم بنجاح ✓");
      router.refresh();
    } catch {
      toast.error("فشل تغيير دور المستخدم");
      setUsers(initialUsers);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Toggle User Active Status
  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    const newStatus = !currentStatus;

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: newStatus } : u));

    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) throw new Error();
      toast.success(newStatus ? "تم تفعيل المستخدم ✓" : "تم تعطل المستخدم ✓");
      router.refresh();
    } catch {
      toast.error("فشل تغيير حالة المستخدم");
      setUsers(initialUsers);
    }
  };

  // Create / Edit User Submit Handler
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email) {
      toast.error("أدخل الاسم والبريد الإلكتروني");
      return;
    }

    if (!editingUser && !userForm.password) {
      toast.error("أدخل كلمة المرور الحساب الجديد");
      return;
    }

    setSavingUser(true);
    try {
      const selectedRole = roles.find(r => r.id === userForm.rolePermissionId);
      const url = editingUser ? `/api/settings/users/${editingUser.id}` : "/api/settings/users";
      const method = editingUser ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...userForm,
          role: selectedRole?.roleName.includes("أدمن") ? "ADMIN" : "CUSTOM",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حفظ بيانات المستخدم");

      if (editingUser) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? data : u));
        toast.success("تم تعديل بيانات المستخدم بنجاح ✓");
      } else {
        setUsers(prev => [data, ...prev]);
        toast.success("تم إنشاء المستخدم وتعيين دوره بنجاح ✓");
      }

      setShowAddUserModal(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "حدث خطأ");
    } finally {
      setSavingUser(false);
    }
  };

  // Toggle permission for a role
  const handleTogglePermission = async (roleId: string, permKey: keyof typeof newRoleForm, currentValue: boolean) => {
    if (!isAdmin) {
      toast.error("فقط الأدمن يمكنه تعديل الصلاحيات");
      return;
    }

    const newValue = !currentValue;
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, [permKey]: newValue } : r));

    try {
      const res = await fetch(`/api/settings/roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [permKey]: newValue }),
      });

      if (!res.ok) throw new Error();
      toast.success("تم تحديث الصلاحية بنجاح ✓");
      router.refresh();
    } catch {
      toast.error("فشل حفظ التعديل");
      setRoles(initialRoles);
    }
  };

  // Create new Role Handler
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.roleName.trim()) {
      toast.error("أدخل اسم الصلاحية/الرول");
      return;
    }

    setSavingRole(true);
    try {
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRoleForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الرول");

      setRoles(prev => [...prev, data]);
      setExpandedRoleIds(prev => [...prev, data.id]);
      setShowAddRoleModal(false);
      setNewRoleForm({
        roleName: "",
        description: "",

        canViewCases: true,
        canEditCases: true,
        canDeleteCases: false,

        canViewDoctors: true,
        canManageDoctors: false,
        canDeleteDoctors: false,

        canViewEmployees: true,
        canManageEmployees: false,
        canDeleteEmployees: false,

        canViewCouriers: true,
        canManageCouriers: false,
        canDeleteCouriers: false,

        canViewProducts: true,
        canManageProducts: false,
        canDeleteProducts: false,

        canViewAppointments: true,
        canEditAppointments: true,
        canDeleteAppointments: false,

        canViewFinance: false,
        canManageExpenses: false,
        canDeleteExpenses: false,

        canViewReports: false,
        canManageSettings: false,
      });

      toast.success("تم إضافة الصلاحية الجديدة بنجاح ✓");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "حدث خطأ");
    } finally {
      setSavingRole(false);
    }
  };

  type PermissionKey = keyof typeof newRoleForm;

  const permissionList: { key: PermissionKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    // 1. الحالات
    { key: "canViewCases",          label: "عرض الحالات",                    icon: Eye },
    { key: "canEditCases",          label: "تعديل بيانات الحالات",            icon: Edit },
    { key: "canDeleteCases",        label: "حذف الحالات",                    icon: Trash2 },

    // 2. الأطباء
    { key: "canViewDoctors",        label: "عرض قائمة الأطباء",              icon: Eye },
    { key: "canManageDoctors",      label: "إضافة وتعديل الأطباء",            icon: Stethoscope },
    { key: "canDeleteDoctors",      label: "حذف الأطباء",                    icon: Trash2 },

    // 3. الموظفين
    { key: "canViewEmployees",      label: "عرض قائمة الموظفين",            icon: Eye },
    { key: "canManageEmployees",    label: "إضافة وتعديل الموظفين",          icon: Users },
    { key: "canDeleteEmployees",    label: "حذف الموظفين",                  icon: Trash2 },

    // 4. المندوبين
    { key: "canViewCouriers",       label: "عرض شاشة وسجلات المندوبين",      icon: Eye },
    { key: "canManageCouriers",     label: "إضافة وتسجيل توريدات المندوبين",  icon: Truck },
    { key: "canDeleteCouriers",     label: "حذف المندوبين وسجلاتهم",          icon: Trash2 },

    // 5. التركيبات والمنتجات
    { key: "canViewProducts",       label: "عرض أسعار وأنواع التركيبات",     icon: Eye },
    { key: "canManageProducts",     label: "إضافة وتعديل أسعار التركيبات",   icon: Package },
    { key: "canDeleteProducts",     label: "حذف أنواع التركيبات",            icon: Trash2 },

    // 6. المواعيد والزيارات
    { key: "canViewAppointments",   label: "عرض جدول المواعيد",              icon: Eye },
    { key: "canEditAppointments",   label: "حجز وتعديل المواعيد",            icon: Calendar },
    { key: "canDeleteAppointments", label: "حذف المواعيد والزيارات",          icon: Trash2 },

    // 7. المعاملات المالية والمصروفات
    { key: "canViewFinance",        label: "عرض الملخص المالي والربح",      icon: Wallet },
    { key: "canManageExpenses",     label: "إدارة وتسجيل المصروفات",         icon: Receipt },
    { key: "canDeleteExpenses",     label: "حذف المصروفات المسجلة",          icon: Trash2 },

    // 8. التقارير والإعدادات
    { key: "canViewReports",        label: "عرض واستخراج التقارير",          icon: BarChart3 },
    { key: "canManageSettings",     label: "إدارة الإعدادات وصلاحيات النظام", icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Top Segmented Controls (Tabs) */}
      <div className="card bg-white p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "users"
                ? "bg-white text-primary shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Users className="w-4 h-4" />
            إدارة المستخدمين والأدوار ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("roles")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "roles"
                ? "bg-white text-primary shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            مصفوفة الصلاحيات والأدوار ({roles.length})
          </button>

          <button
            onClick={() => setActiveTab("backup")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "backup"
                ? "bg-white text-primary shadow-xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            النسخ الاحتياطي والبيانات
          </button>
        </div>

        {isAdmin && activeTab !== "backup" && (
          <div>
            {activeTab === "users" ? (
              <button onClick={openAddUserModal} className="btn btn-primary btn-sm">
                <UserPlus className="w-4 h-4" />
                إضافة مستخدم جديد
              </button>
            ) : (
              <button onClick={() => setShowAddRoleModal(true)} className="btn btn-primary btn-sm">
                <Plus className="w-4 h-4" />
                إضافة دور / صلاحية جديدة
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div key={user.id} className="card bg-white p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 text-primary flex items-center justify-center font-bold text-sm shadow-xs">
                        {user.name.split(" ").slice(0, 2).map(n => n[0]).join("")}
                      </div>
                      <div>
                        <h3 className="font-bold text-ink text-base">{user.name}</h3>
                        <p className="text-xs text-ink-muted dir-ltr text-right">{user.email}</p>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditUserModal(user)} className="btn-icon" title="تعديل المستخدم">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id, user.name)} className="btn-icon hover:!bg-red-50 text-red-600" title="حذف المستخدم">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    {user.phone ? (
                      <div className="text-ink-muted flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    ) : <span />}

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-ink-muted font-medium">الحالة:</span>
                      <label className="relative inline-flex items-center cursor-pointer" title="تفعيل/تعطيل الحساب">
                        <input
                          type="checkbox"
                          checked={user.isActive}
                          disabled={!isAdmin}
                          onChange={() => handleToggleUserActive(user.id, user.isActive)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Role Selection Dropdown */}
                <div className="pt-3 border-t border-gray-100 space-y-1">
                  <label className="text-[11px] font-bold text-ink-muted uppercase">الدور / الصلاحية المعينة</label>
                  <select
                    value={user.rolePermissionId || ""}
                    disabled={!isAdmin || updatingUserId === user.id}
                    onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                    className="input font-bold text-xs text-primary"
                    style={{ height: "38px", background: "rgba(0, 102, 204, 0.04)" }}
                  >
                    <option value="" disabled>اختر الصلاحية...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS (SLEEK COLLAPSIBLE ACCORDION LIST) */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          {roles.map((role) => {
            const isExpanded = expandedRoleIds.includes(role.id);
            const activePermsCount = permissionList.filter(p => Boolean(role[p.key])).length;

            return (
              <div key={role.id} className="card bg-white p-0 overflow-hidden transition-all shadow-xs border border-gray-100">
                {/* Accordion Header */}
                <div
                  onClick={() => toggleRoleExpand(role.id)}
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-ink flex items-center gap-2">
                        {role.roleName}
                        <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-blue-50 text-primary">
                          {activePermsCount} من {permissionList.length} صلاحيات مفعلة
                        </span>
                      </h3>
                      {role.description && <p className="text-xs text-ink-muted mt-0.5">{role.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-ink-muted">
                      {isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل والصلاحيات"}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink-muted">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Accordion Body (Permission Toggles Dropdown) */}
                {isExpanded && (
                  <div className="p-5 bg-gray-50/50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {permissionList.map((perm) => {
                      const isChecked = Boolean(role[perm.key]);
                      const Icon = perm.icon;
                      return (
                        <div
                          key={perm.key}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border transition-all"
                          style={{
                            borderColor: isChecked ? "rgba(0, 102, 204, 0.2)" : "#e5e7eb",
                          }}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                            <Icon className={`w-4 h-4 ${isChecked ? "text-primary" : "text-ink-subtle"}`} />
                            <span>{perm.label}</span>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!isAdmin}
                              onChange={() => handleTogglePermission(role.id, perm.key, isChecked)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: BACKUP & DATABASE RESTORE */}
      {activeTab === "backup" && stats && (
        <BackupSection stats={stats} isAdmin={isAdmin} />
      )}

      {/* MODAL: ADD / EDIT USER */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddUserModal(false)}>
          <div className="modal-sheet max-w-md animate-fadeIn">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-ink">
                  {editingUser ? `تعديل المستخدم: ${editingUser.name}` : "إضافة مستخدم جديد للنظام"}
                </h3>
                <p className="text-xs text-ink-muted">
                  {editingUser ? "تعديل البيانات والدور المعين" : "أدخل بيانات المستخدم وحدد الصلاحية المخصصة له"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body">
                <div>
                  <label className="label">الاسم بالكامل *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: أحمد عبد الفتاح"
                    value={userForm.name}
                    onChange={(e) => setUserForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">البريد الإلكتروني (اسم الدخول) *</label>
                  <input
                    type="email"
                    className="input dir-ltr text-right"
                    placeholder="user@ddhdental.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">{editingUser ? "كلمة المرور الجديدة (اتركها فارغة إذا لم تُرِد التغيير)" : "كلمة المرور *"}</label>
                  <input
                    type="password"
                    className="input dir-ltr text-right"
                    placeholder="••••••••"
                    value={userForm.password}
                    onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))}
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="label">رقم الهاتف (اختياري)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="010..."
                    value={userForm.phone}
                    onChange={(e) => setUserForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">الدور / الصلاحية المحددة *</label>
                  <select
                    value={userForm.rolePermissionId}
                    onChange={(e) => setUserForm(f => ({ ...f, rolePermissionId: e.target.value }))}
                    className="input font-bold text-xs text-primary"
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="btn btn-ghost btn-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={savingUser} className="btn btn-primary btn-sm">
                  {savingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingUser ? "حفظ التعديلات" : "إضافة المستخدم"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW ROLE */}
      {showAddRoleModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddRoleModal(false)}>
          <div className="modal-sheet max-w-lg animate-fadeIn">
            <div className="modal-header">
              <div>
                <h3 className="text-base font-bold text-ink">إضافة دور / صلاحية جديدة</h3>
                <p className="text-xs text-ink-muted">أدخل اسم الرول وحدد الصلاحيات المسموحة لها</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:text-ink hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body">
                <div>
                  <label className="label">اسم الرول / الصلاحية *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: فني ديزاين، استقبال، محاسب..."
                    value={newRoleForm.roleName}
                    onChange={(e) => setNewRoleForm(f => ({ ...f, roleName: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="label">وصف الرول (اختياري)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: يختص بإدخال الحالات وتجهيز المارجن والديزاين"
                    value={newRoleForm.description}
                    onChange={(e) => setNewRoleForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="label">الصلاحيات المسموحة</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                    {permissionList.map((perm) => (
                      <label key={perm.key} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                        <span className="text-xs font-semibold text-ink">{perm.label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean(newRoleForm[perm.key])}
                          onChange={(e) => setNewRoleForm(f => ({ ...f, [perm.key]: e.target.checked }))}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddRoleModal(false)} className="btn btn-ghost btn-sm">
                  إلغاء
                </button>
                <button type="submit" disabled={savingRole} className="btn btn-primary btn-sm">
                  {savingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ الصلاحية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
