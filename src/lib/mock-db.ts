import initialData from "@/data/mock-data.json";

// Type definitions matching Prisma schema
export type Role = "SUPER_ADMIN" | "ADMIN" | "LAB_MANAGER" | "EMPLOYEE" | "CUSTOM";
export type CaseStatus =
  | "RECEIVED"
  | "IN_PROGRESS"
  | "PROOF_SENT"
  | "PROOF_RETURNED"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";
export type ExpenseCategory =
  | "RENT"
  | "SALARY"
  | "TRANSPORT"
  | "SUPPLIES"
  | "UTILITIES"
  | "LAB_INVOICE"
  | "OTHER";

// In-Memory Database Store (Global singleton to persist across hot-reloads and API calls)
interface MockStore {
  rolePermissions: Array<Record<string, any>>;
  users: Array<Record<string, any>>;
  productTypes: Array<Record<string, any>>;
  doctors: Array<Record<string, any>>;
  employees: Array<Record<string, any>>;
  cases: Array<Record<string, any>>;
  payments: Array<Record<string, any>>;
  expenses: Array<Record<string, any>>;
  appointments: Array<Record<string, any>>;
  courierRemittances: Array<Record<string, any>>;
  fundTransfers: Array<Record<string, any>>;
  auditLogs: Array<Record<string, any>>;
  sessions: Array<Record<string, any>>;
}

const globalStore = globalThis as unknown as {
  __ddh_mock_db__?: MockStore;
};

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function initializeStore(): MockStore {
  return {
    rolePermissions: cloneDeep(initialData.rolePermissions || []),
    users: cloneDeep(initialData.users || []),
    productTypes: cloneDeep(initialData.productTypes || []),
    doctors: cloneDeep(initialData.doctors || []),
    employees: cloneDeep(initialData.employees || []),
    cases: cloneDeep(initialData.cases || []),
    payments: cloneDeep(initialData.payments || []),
    expenses: cloneDeep(initialData.expenses || []),
    appointments: cloneDeep(initialData.appointments || []),
    courierRemittances: cloneDeep(initialData.courierRemittances || []),
    fundTransfers: cloneDeep(initialData.fundTransfers || []),
    auditLogs: cloneDeep(initialData.auditLogs || []),
    sessions: [],
  };
}

if (!globalStore.__ddh_mock_db__) {
  globalStore.__ddh_mock_db__ = initializeStore();
}

export function resetMockDatabase() {
  globalStore.__ddh_mock_db__ = initializeStore();
}

export function getMockStore(): MockStore {
  if (!globalStore.__ddh_mock_db__) {
    globalStore.__ddh_mock_db__ = initializeStore();
  }
  return globalStore.__ddh_mock_db__;
}

// ─── Query Engine Helper Functions ───────────────────────────────────────────

function generateId(prefix: string = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

function matchValue(recordValue: any, filterValue: any): boolean {
  if (filterValue === undefined) return true;

  // Handle Date comparison
  const isDateRecord = recordValue instanceof Date || (typeof recordValue === "string" && !isNaN(Date.parse(recordValue)) && (recordValue.includes("T") || recordValue.includes("-")));
  const isDateFilter = filterValue instanceof Date || (typeof filterValue === "string" && !isNaN(Date.parse(filterValue)) && (filterValue.includes("T") || filterValue.includes("-")));

  if (typeof filterValue === "object" && filterValue !== null) {
    // Prisma Operators: in, notIn, not, gte, lte, gt, lt, startsWith, contains, equals, mode
    let match = true;

    if (filterValue.in !== undefined) {
      match = match && filterValue.in.includes(recordValue);
    }
    if (filterValue.notIn !== undefined) {
      match = match && !filterValue.notIn.includes(recordValue);
    }
    if (filterValue.not !== undefined) {
      if (typeof filterValue.not === "object" && filterValue.not !== null) {
        match = match && !matchValue(recordValue, filterValue.not);
      } else {
        match = match && recordValue !== filterValue.not;
      }
    }
    if (filterValue.gte !== undefined) {
      const targetTime = filterValue.gte instanceof Date ? filterValue.gte.getTime() : new Date(filterValue.gte).getTime();
      const recTime = recordValue instanceof Date ? recordValue.getTime() : new Date(recordValue).getTime();
      match = match && !isNaN(recTime) && recTime >= targetTime;
    }
    if (filterValue.lte !== undefined) {
      const targetTime = filterValue.lte instanceof Date ? filterValue.lte.getTime() : new Date(filterValue.lte).getTime();
      const recTime = recordValue instanceof Date ? recordValue.getTime() : new Date(recordValue).getTime();
      match = match && !isNaN(recTime) && recTime <= targetTime;
    }
    if (filterValue.gt !== undefined) {
      if (typeof recordValue === "number") {
        match = match && recordValue > filterValue.gt;
      } else {
        const targetTime = filterValue.gt instanceof Date ? filterValue.gt.getTime() : new Date(filterValue.gt).getTime();
        const recTime = recordValue instanceof Date ? recordValue.getTime() : new Date(recordValue).getTime();
        match = match && !isNaN(recTime) && recTime > targetTime;
      }
    }
    if (filterValue.lt !== undefined) {
      if (typeof recordValue === "number") {
        match = match && recordValue < filterValue.lt;
      } else {
        const targetTime = filterValue.lt instanceof Date ? filterValue.lt.getTime() : new Date(filterValue.lt).getTime();
        const recTime = recordValue instanceof Date ? recordValue.getTime() : new Date(recordValue).getTime();
        match = match && !isNaN(recTime) && recTime < targetTime;
      }
    }
    if (filterValue.startsWith !== undefined) {
      const strVal = String(recordValue || "");
      match = match && strVal.startsWith(String(filterValue.startsWith));
    }
    if (filterValue.contains !== undefined) {
      const strVal = String(recordValue || "");
      const search = String(filterValue.contains);
      if (filterValue.mode === "insensitive") {
        match = match && strVal.toLowerCase().includes(search.toLowerCase());
      } else {
        match = match && strVal.includes(search);
      }
    }
    if (filterValue.equals !== undefined) {
      match = match && recordValue === filterValue.equals;
    }
    return match;
  }

  // Exact comparison
  if (isDateRecord && isDateFilter && (typeof filterValue === "string" || filterValue instanceof Date)) {
    return new Date(recordValue).getTime() === new Date(filterValue).getTime();
  }

  return recordValue === filterValue;
}

function matchWhere(record: Record<string, any>, where?: Record<string, any>): boolean {
  if (!where) return true;

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(value)) {
      if (!value.some((condition) => matchWhere(record, condition))) return false;
      continue;
    }
    if (key === "AND" && Array.isArray(value)) {
      if (!value.every((condition) => matchWhere(record, condition))) return false;
      continue;
    }
    if (key === "NOT") {
      if (Array.isArray(value)) {
        if (value.some((condition) => matchWhere(record, condition))) return false;
      } else if (typeof value === "object" && value !== null) {
        if (matchWhere(record, value)) return false;
      }
      continue;
    }

    if (!matchValue(record[key], value)) {
      return false;
    }
  }

  return true;
}

function sortRecords(records: Array<Record<string, any>>, orderBy?: any): Array<Record<string, any>> {
  if (!orderBy) return records;

  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];

  return [...records].sort((a, b) => {
    for (const order of orders) {
      for (const [field, direction] of Object.entries(order)) {
        const valA = a[field];
        const valB = b[field];

        if (valA === valB) continue;
        if (valA === null || valA === undefined) return direction === "asc" ? 1 : -1;
        if (valB === null || valB === undefined) return direction === "asc" ? -1 : 1;

        // Date sorting
        if (typeof valA === "string" && typeof valB === "string" && !isNaN(Date.parse(valA)) && !isNaN(Date.parse(valB))) {
          const diff = new Date(valA).getTime() - new Date(valB).getTime();
          if (diff !== 0) return direction === "asc" ? diff : -diff;
        }

        // String sorting
        if (typeof valA === "string" && typeof valB === "string") {
          const diff = valA.localeCompare(valB, "ar");
          if (diff !== 0) return direction === "asc" ? diff : -diff;
        }

        // Numeric or Boolean sorting
        if (valA < valB) return direction === "asc" ? -1 : 1;
        if (valA > valB) return direction === "asc" ? 1 : -1;
      }
    }
    return 0;
  });
}

function resolveIncludes(modelName: string, record: any, include?: Record<string, any>): any {
  if (!record) return record;
  if (!include) return cloneDeep(record);

  const db = getMockStore();
  const res = cloneDeep(record);

  if (modelName === "case") {
    if (include.doctor) {
      const doc = db.doctors.find((d) => d.id === record.doctorId);
      res.doctor = include.doctor === true ? doc : projectSelect(doc, include.doctor?.select);
    }
    if (include.productType) {
      const pt = db.productTypes.find((p) => p.id === record.productTypeId);
      res.productType = include.productType === true ? pt : projectSelect(pt, include.productType?.select);
    }
    if (include.payments) {
      let pmts = db.payments.filter((p) => p.caseId === record.id);
      if (include.payments.orderBy) {
        pmts = sortRecords(pmts, include.payments.orderBy);
      }
      res.payments = pmts.map((p) => resolveIncludes("payment", p, include.payments.include));
    }
    if (include.appointments) {
      res.appointments = db.appointments.filter((a) => a.caseId === record.id);
    }
  } else if (modelName === "payment") {
    if (include.case) {
      const c = db.cases.find((cs) => cs.id === record.caseId);
      res.case = resolveIncludes("case", c, include.case.include);
    }
    if (include.courier) {
      const emp = db.employees.find((e) => e.id === record.courierId);
      res.courier = include.courier === true ? emp : projectSelect(emp, include.courier?.select);
    }
    if (include.createdBy) {
      const u = db.users.find((usr) => usr.id === record.createdById);
      res.createdBy = include.createdBy === true ? u : projectSelect(u, include.createdBy?.select);
    }
  } else if (modelName === "expense") {
    if (include.employee) {
      const emp = db.employees.find((e) => e.id === record.employeeId);
      res.employee = include.employee === true ? emp : projectSelect(emp, include.employee?.select);
    }
    if (include.doctor) {
      const doc = db.doctors.find((d) => d.id === record.doctorId);
      res.doctor = include.doctor === true ? doc : projectSelect(doc, include.doctor?.select);
    }
    if (include.createdBy) {
      const u = db.users.find((usr) => usr.id === record.createdById);
      res.createdBy = include.createdBy === true ? u : projectSelect(u, include.createdBy?.select);
    }
  } else if (modelName === "doctor") {
    if (include.cases) {
      res.cases = db.cases.filter((c) => c.doctorId === record.id);
    }
    if (include.appointments) {
      res.appointments = db.appointments.filter((a) => a.doctorId === record.id);
    }
    if (include.expenses) {
      res.expenses = db.expenses.filter((e) => e.doctorId === record.id);
    }
    if (include._count) {
      res._count = {
        cases: db.cases.filter((c) => c.doctorId === record.id).length,
      };
    }
  } else if (modelName === "employee") {
    if (include.expenses) {
      res.expenses = db.expenses.filter((e) => e.employeeId === record.id);
    }
    if (include.collectedPayments) {
      res.collectedPayments = db.payments.filter((p) => p.courierId === record.id);
    }
    if (include.remittances) {
      res.remittances = db.courierRemittances.filter((r) => r.employeeId === record.id);
    }
  } else if (modelName === "appointment") {
    if (include.doctor) {
      const doc = db.doctors.find((d) => d.id === record.doctorId);
      res.doctor = include.doctor === true ? doc : projectSelect(doc, include.doctor?.select);
    }
    if (include.case) {
      const c = db.cases.find((cs) => cs.id === record.caseId);
      res.case = include.case === true ? c : projectSelect(c, include.case?.select);
    }
  } else if (modelName === "courierRemittance") {
    if (include.employee) {
      const emp = db.employees.find((e) => e.id === record.employeeId);
      res.employee = include.employee === true ? emp : projectSelect(emp, include.employee?.select);
    }
    if (include.createdBy) {
      const u = db.users.find((usr) => usr.id === record.createdById);
      res.createdBy = include.createdBy === true ? u : projectSelect(u, include.createdBy?.select);
    }
  } else if (modelName === "fundTransfer") {
    if (include.createdBy) {
      const u = db.users.find((usr) => usr.id === record.createdById);
      res.createdBy = include.createdBy === true ? u : projectSelect(u, include.createdBy?.select);
    }
  } else if (modelName === "user") {
    if (include.rolePermission) {
      res.rolePermission = db.rolePermissions.find((rp) => rp.id === record.rolePermissionId) || null;
    }
  } else if (modelName === "auditLog") {
    if (include.user) {
      const u = db.users.find((usr) => usr.id === record.userId);
      res.user = include.user === true ? u : projectSelect(u, include.user?.select);
    }
  }

  return res;
}

function projectSelect(record: any, select?: Record<string, any>): any {
  if (!record || !select) return record;
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true) {
      result[key] = record[key];
    } else if (typeof val === "object" && val !== null) {
      result[key] = projectSelect(record[key], val);
    }
  }
  return result;
}

// ─── Generic Model Operations Factory ─────────────────────────────────────────

function createModelHandler(modelKey: keyof MockStore, modelName: string) {
  return {
    async findMany(args: { where?: any; orderBy?: any; take?: number; skip?: number; include?: any; select?: any } = {}) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;

      let results = list.filter((item) => matchWhere(item, args.where));
      results = sortRecords(results, args.orderBy);

      if (args.skip) {
        results = results.slice(args.skip);
      }
      if (args.take !== undefined) {
        results = results.slice(0, args.take);
      }

      return results.map((item) => {
        let res = resolveIncludes(modelName, item, args.include);
        if (args.select) {
          res = projectSelect(res, args.select);
        }
        return res;
      });
    },

    async findUnique(args: { where: any; include?: any; select?: any }) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;
      const item = list.find((record) => matchWhere(record, args.where));
      if (!item) return null;

      let res = resolveIncludes(modelName, item, args.include);
      if (args.select) {
        res = projectSelect(res, args.select);
      }
      return res;
    },

    async findFirst(args: { where?: any; orderBy?: any; include?: any; select?: any } = {}) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;
      let results = list.filter((item) => matchWhere(item, args.where));
      results = sortRecords(results, args.orderBy);

      const item = results[0];
      if (!item) return null;

      let res = resolveIncludes(modelName, item, args.include);
      if (args.select) {
        res = projectSelect(res, args.select);
      }
      return res;
    },

    async count(args: { where?: any } = {}) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;
      if (!args.where) return list.length;
      return list.filter((item) => matchWhere(item, args.where)).length;
    },

    async aggregate(args: { where?: any; _sum?: Record<string, boolean>; _count?: any; _avg?: any; _min?: any; _max?: any } = {}) {
      const store = getMockStore();
      const list = (store[modelKey] as Array<Record<string, any>>).filter((item) => matchWhere(item, args.where));

      const result: Record<string, any> = {};

      if (args._sum) {
        result._sum = {};
        for (const [field, isSum] of Object.entries(args._sum)) {
          if (isSum) {
            result._sum[field] = list.reduce((acc, curr) => acc + (Number(curr[field]) || 0), 0);
          }
        }
      }

      if (args._count) {
        result._count = list.length;
      }

      return result;
    },

    async create(args: { data: Record<string, any>; include?: any; select?: any }) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;

      const now = new Date().toISOString();
      const newItem: Record<string, any> = {
        id: args.data.id || generateId(modelName),
        ...args.data,
        createdAt: args.data.createdAt ? new Date(args.data.createdAt).toISOString() : now,
        updatedAt: now,
      };

      // Handle Date objects inside data
      for (const [k, v] of Object.entries(newItem)) {
        if (v instanceof Date) {
          newItem[k] = v.toISOString();
        }
      }

      list.push(newItem);

      let res = resolveIncludes(modelName, newItem, args.include);
      if (args.select) {
        res = projectSelect(res, args.select);
      }
      return res;
    },

    async createMany(args: { data: Array<Record<string, any>> }) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;
      const now = new Date().toISOString();

      let count = 0;
      for (const item of args.data) {
        list.push({
          id: item.id || generateId(modelName),
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : now,
          updatedAt: now,
        });
        count++;
      }
      return { count };
    },

    async update(args: { where: any; data: Record<string, any>; include?: any; select?: any }) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;
      const idx = list.findIndex((item) => matchWhere(item, args.where));

      if (idx === -1) {
        throw new Error(`Record to update not found in ${modelName}`);
      }

      const existing = list[idx];
      const updated = { ...existing };

      for (const [key, value] of Object.entries(args.data)) {
        if (value !== undefined) {
          if (value instanceof Date) {
            updated[key] = value.toISOString();
          } else if (typeof value === "object" && value !== null && (value.increment !== undefined || value.decrement !== undefined)) {
            const currentNum = Number(existing[key]) || 0;
            if (value.increment !== undefined) {
              updated[key] = currentNum + Number(value.increment);
            }
            if (value.decrement !== undefined) {
              updated[key] = currentNum - Number(value.decrement);
            }
          } else {
            updated[key] = value;
          }
        }
      }

      updated.updatedAt = new Date().toISOString();
      list[idx] = updated;

      let res = resolveIncludes(modelName, updated, args.include);
      if (args.select) {
        res = projectSelect(res, args.select);
      }
      return res;
    },

    async updateMany(args: { where: any; data: Record<string, any> }) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;

      let count = 0;
      for (let i = 0; i < list.length; i++) {
        if (matchWhere(list[i], args.where)) {
          const updated = { ...list[i], ...args.data, updatedAt: new Date().toISOString() };
          list[i] = updated;
          count++;
        }
      }
      return { count };
    },

    async delete(args: { where: any; select?: any }) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;
      const idx = list.findIndex((item) => matchWhere(item, args.where));

      if (idx === -1) {
        throw new Error(`Record to delete not found in ${modelName}`);
      }

      const [deleted] = list.splice(idx, 1);
      return args.select ? projectSelect(deleted, args.select) : deleted;
    },

    async deleteMany(args: { where?: any } = {}) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;

      if (!args.where) {
        const count = list.length;
        store[modelKey] = [] as any;
        return { count };
      }

      const remaining: Array<Record<string, any>> = [];
      let count = 0;
      for (const item of list) {
        if (matchWhere(item, args.where)) {
          count++;
        } else {
          remaining.push(item);
        }
      }
      (store[modelKey] as any) = remaining;
      return { count };
    },

    async upsert(args: { where: any; update: Record<string, any>; create: Record<string, any>; include?: any; select?: any }) {
      const store = getMockStore();
      const list = store[modelKey] as Array<Record<string, any>>;
      const existing = list.find((item) => matchWhere(item, args.where));

      if (existing) {
        return this.update({ where: args.where, data: args.update, include: args.include, select: args.select });
      } else {
        return this.create({ data: args.create, include: args.include, select: args.select });
      }
    },
  };
}

// ─── Prisma-Compatible Client Instance ────────────────────────────────────────

export const mockPrisma = {
  user: createModelHandler("users", "user"),
  rolePermission: createModelHandler("rolePermissions", "rolePermission"),
  productType: createModelHandler("productTypes", "productType"),
  doctor: createModelHandler("doctors", "doctor"),
  employee: createModelHandler("employees", "employee"),
  case: createModelHandler("cases", "case"),
  payment: createModelHandler("payments", "payment"),
  expense: createModelHandler("expenses", "expense"),
  appointment: createModelHandler("appointments", "appointment"),
  courierRemittance: createModelHandler("courierRemittances", "courierRemittance"),
  fundTransfer: createModelHandler("fundTransfers", "fundTransfer"),
  auditLog: createModelHandler("auditLogs", "auditLog"),
  session: createModelHandler("sessions", "session"),

  async $transaction(actions: Array<Promise<any>> | ((tx: any) => Promise<any>)) {
    if (typeof actions === "function") {
      return actions(mockPrisma);
    }
    return Promise.all(actions);
  },
};
