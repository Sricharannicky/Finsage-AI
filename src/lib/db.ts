// Firestore-backed DB layer — Prisma-compatible API
// Replaces Prisma + SQLite (db/custom.db) with Firebase Firestore via firebase-admin.
// Keeps the same `db.<model>.<method>` shape so all existing API routes keep working.
//
// Collections:
//   users, incomes, expenses, budgets, savingsGoals, aiChats,
//   predictions, notifications, bills, investments, achievements, challenges
//
// Env required:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

import { getFirestore, isFirebaseConfigured } from "./firebase";
import { Timestamp, type DocumentData, type QuerySnapshot } from "firebase-admin/firestore";

function assertConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env (see .env.example). " +
        "Create a Firebase project at https://console.firebase.google.com → Project Settings → Service Accounts → Generate new private key."
    );
  }
}

function firestore() {
  assertConfigured();
  const fs = getFirestore();
  if (!fs) throw new Error("Failed to initialize Firestore. Check Firebase credentials.");
  return fs;
}

// ---------- Date / Timestamp helpers ----------

function toDate(value: any): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function serializeForFirestore(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Date) {
      out[k] = Timestamp.fromDate(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function deserializeDoc(id: string, data: DocumentData): any {
  const out: any = { id };
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && typeof (v as any).toDate === "function") {
      try {
        out[k] = (v as Timestamp).toDate();
      } catch {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ---------- where-matching (in-memory, Prisma-like) ----------

function getComparable(v: any): number | string {
  const d = toDate(v);
  if (d) return d.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === undefined) return "";
  return String(v);
}

function matchesFieldCondition(value: any, cond: any): boolean {
  if (cond === null || cond === undefined) return value === cond;
  if (typeof cond !== "object" || cond instanceof Date) {
    // direct equality (with date awareness)
    const a = toDate(value);
    const b = toDate(cond);
    if (a && b) return a.getTime() === b.getTime();
    return value === cond;
  }

  // operator object: { gte, lte, gt, lt, contains, equals, in }
  if ("contains" in cond) {
    const needle = String(cond.contains ?? "").toLowerCase();
    const hay = value === null || value === undefined ? "" : String(value).toLowerCase();
    // Prisma `contains` supports mode insensitive optionally; we always do insensitive
    if (!hay.includes(needle)) return false;
  }
  if ("equals" in cond) {
    if (value !== cond.equals) return false;
  }
  if ("in" in cond && Array.isArray(cond.in)) {
    if (!cond.in.includes(value)) return false;
  }
  if ("gte" in cond && cond.gte !== undefined) {
    if (getComparable(value) < getComparable(cond.gte)) return false;
  }
  if ("lte" in cond && cond.lte !== undefined) {
    if (getComparable(value) > getComparable(cond.lte)) return false;
  }
  if ("gt" in cond && cond.gt !== undefined) {
    if (getComparable(value) <= getComparable(cond.gt)) return false;
  }
  if ("lt" in cond && cond.lt !== undefined) {
    if (getComparable(value) >= getComparable(cond.lt)) return false;
  }
  return true;
}

function matchesWhere(doc: any, where: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(cond)) {
      const anyMatch = (cond as any[]).some((sub) => matchesWhere(doc, sub));
      if (!anyMatch) return false;
      continue;
    }
    if (key === "AND" && Array.isArray(cond)) {
      const allMatch = (cond as any[]).every((sub) => matchesWhere(doc, sub));
      if (!allMatch) return false;
      continue;
    }
    if (key === "NOT") {
      if (matchesWhere(doc, cond)) return false;
      continue;
    }
    // Skip Prisma composite unique keys handled separately (e.g. userId_category_month_period)
    if (key.includes("_") && typeof cond === "object" && cond !== null && !("gte" in (cond as any)) && !("lte" in (cond as any)) && !("contains" in (cond as any)) && !(cond instanceof Date)) {
      // Might be composite key like userId_category_month_period: { userId, category, month, period }
      const sub = cond as Record<string, any>;
      const isComposite = Object.values(sub).every((v) => typeof v !== "object" || v instanceof Date);
      if (isComposite && key.includes("userId")) {
        for (const [sk, sv] of Object.entries(sub)) {
          if (doc[sk] !== sv) return false;
        }
        continue;
      }
    }
    if (!matchesFieldCondition(doc[key], cond)) return false;
  }
  return true;
}

function applySelect<T>(doc: T, select?: Record<string, boolean>): T {
  if (!select) return doc;
  const out: any = {};
  // Always include id unless explicitly excluded
  const d: any = doc;
  if (d.id !== undefined) out.id = d.id;
  for (const [k, v] of Object.entries(select)) {
    if (v) out[k] = d[k];
  }
  return out as T;
}

function applyOrderBy(docs: any[], orderBy: any): any[] {
  if (!orderBy) return docs;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sorted = [...docs];
  // Apply in reverse so first orderBy has highest priority
  for (let i = orders.length - 1; i >= 0; i--) {
    const ob = orders[i];
    const [field, dir] = Object.entries(ob)[0] as [string, string];
    sorted.sort((a, b) => {
      const av = getComparable(a[field]);
      const bv = getComparable(b[field]);
      if (av < bv) return dir === "desc" ? 1 : -1;
      if (av > bv) return dir === "desc" ? -1 : 1;
      return 0;
    });
  }
  return sorted;
}

// ---------- Generic collection handler ----------

const COLLECTIONS: Record<string, string> = {
  user: "users",
  income: "incomes",
  expense: "expenses",
  budget: "budgets",
  savingsGoal: "savingsGoals",
  aiChat: "aiChats",
  prediction: "predictions",
  notification: "notifications",
  bill: "bills",
  investment: "investments",
  achievement: "achievements",
  challenge: "challenges",
};

function newId(collection: string): string {
  // Use Firestore auto-ID for compatibility
  return firestore().collection(collection).doc().id;
}

function nowDate(): Date {
  return new Date();
}

function withDefaults(model: string, data: Record<string, any>): Record<string, any> {
  const now = nowDate();
  const base: Record<string, any> = { ...data };
  if (!base.createdAt && model !== "user") {
    // users also get createdAt via Prisma default; add for all
    base.createdAt = now;
  }
  if (!base.createdAt) base.createdAt = now;
  // updatedAt for models that have it
  if (
    ["user", "income", "expense", "budget", "savingsGoal", "bill", "investment", "challenge"].includes(
      model
    )
  ) {
    base.updatedAt = now;
  }
  // Model-specific defaults mirroring prisma/schema.prisma
  if (model === "user") {
    base.currency = base.currency ?? "INR";
    base.monthlyIncomeGoal = base.monthlyIncomeGoal ?? 0;
    base.savingsTarget = base.savingsTarget ?? 0;
    if (base.email) base.email = String(base.email).toLowerCase();
  }
  if (model === "income") {
    base.recurring = base.recurring ?? false;
  }
  if (model === "expense") {
    base.paymentMethod = base.paymentMethod ?? "Cash";
    base.recurring = base.recurring ?? false;
    base.flagged = base.flagged ?? false;
  }
  if (model === "budget") {
    base.period = base.period ?? "monthly";
  }
  if (model === "savingsGoal") {
    base.currentAmount = base.currentAmount ?? 0;
    base.priority = base.priority ?? "medium";
  }
  if (model === "notification") {
    base.read = base.read ?? false;
    base.severity = base.severity ?? "info";
  }
  if (model === "bill") {
    base.frequency = base.frequency ?? "monthly";
    base.paid = base.paid ?? false;
    base.autoPay = base.autoPay ?? false;
  }
  if (model === "investment") {
    base.units = base.units ?? 0;
  }
  if (model === "achievement") {
    base.progress = base.progress ?? 100;
  }
  if (model === "challenge") {
    base.completedDays = base.completedDays ?? 0;
    base.status = base.status ?? "active";
    if (!base.startDate) base.startDate = now;
  }
  return base;
}

async function fetchAll(model: string, where?: any): Promise<any[]> {
  const fs = firestore();
  const colName = COLLECTIONS[model];
  const col = fs.collection(colName);

  let snapshot: QuerySnapshot;
  // Narrow by userId server-side when present (most queries are per-user)
  if (where && typeof where.userId === "string") {
    try {
      snapshot = await col.where("userId", "==", where.userId).get();
    } catch {
      snapshot = await col.get();
    }
  } else if (where && typeof where.email === "string" && model === "user") {
    try {
      snapshot = await col.where("email", "==", String(where.email).toLowerCase()).get();
    } catch {
      snapshot = await col.get();
    }
  } else {
    snapshot = await col.get();
  }

  const docs = snapshot.docs.map((d) => deserializeDoc(d.id, d.data()));
  return docs.filter((doc) => matchesWhere(doc, where));
}

function createHandler(model: string) {
  const colName = COLLECTIONS[model];

  async function findUniqueDoc(where: any, select?: any) {
    if (!where) return null;
    // Direct doc lookup by id when only id (or id + extra ownership fields)
    if (typeof where.id === "string") {
      try {
        const snap = await firestore().collection(colName).doc(where.id).get();
        if (snap.exists) {
          const doc = deserializeDoc(snap.id, snap.data()!);
          // Enforce extra where fields (e.g. userId ownership check)
          const rest = { ...where };
          delete rest.id;
          if (Object.keys(rest).length === 0 || matchesWhere(doc, rest)) {
            return select ? applySelect(doc, select) : doc;
          }
          return null;
        }
      } catch {
        // fall through to scan
      }
    }
    const docs = await fetchAll(model, where);
    const first = docs[0] ?? null;
    if (!first) return null;
    return select ? applySelect(first, select) : first;
  }

  const handler: any = {
    async findMany(args: any = {}) {
      const { where, orderBy, take, select, skip } = args;
      let docs = await fetchAll(model, where);
      docs = applyOrderBy(docs, orderBy);
      if (typeof skip === "number" && skip > 0) docs = docs.slice(skip);
      if (typeof take === "number") docs = docs.slice(0, take);
      if (select) docs = docs.map((d) => applySelect(d, select));
      return docs;
    },

    async findUnique(args: any = {}) {
      const { where, select } = args;
      return findUniqueDoc(where, select);
    },

    async findFirst(args: any = {}) {
      const { where, orderBy, select } = args;
      let docs = await fetchAll(model, where);
      docs = applyOrderBy(docs, orderBy);
      const first = docs[0] ?? null;
      if (!first) return null;
      return select ? applySelect(first, select) : first;
    },

    async create(args: any = {}) {
      const { data, select } = args;
      const id = (data as any)?.id ?? newId(colName);
      const withDef = withDefaults(model, data);
      // Ensure Date objects are serialized
      const payload = serializeForFirestore({ ...withDef });
      delete (payload as any).id;
      await firestore().collection(colName).doc(id).set(payload);
      const snap = await firestore().collection(colName).doc(id).get();
      const doc = deserializeDoc(snap.id, snap.data()!);
      return select ? applySelect(doc, select) : doc;
    },

    async createMany(args: any = {}) {
      const { data } = args;
      const rows = Array.isArray(data) ? data : [data];
      const fs = firestore();
      const batch = fs.batch();
      for (const row of rows) {
        const rowId: string = (row as any)?.id ?? fs.collection(colName).doc().id;
        const withDef = withDefaults(model, row);
        const payload = serializeForFirestore({ ...withDef });
        delete (payload as any).id;
        batch.set(fs.collection(colName).doc(rowId), payload);
      }
      await batch.commit();
      return { count: rows.length };
    },

    async update(args: any = {}) {
      const { where, data, select } = args;
      // Resolve target doc (must exist)
      const existing = await findUniqueDoc(where);
      if (!existing) throw new Error(`${model} not found for update`);
      const payload = serializeForFirestore({
        ...data,
        updatedAt: nowDate(),
      });
      delete (payload as any).id;
      // Remove undefined values (Firestore rejects them)
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k];
      }
      await firestore().collection(colName).doc(existing.id).update(payload);
      const snap = await firestore().collection(colName).doc(existing.id).get();
      const doc = deserializeDoc(snap.id, snap.data()!);
      return select ? applySelect(doc, select) : doc;
    },

    async updateMany(args: any = {}) {
      const { where, data } = args;
      const docs = await fetchAll(model, where);
      if (docs.length === 0) return { count: 0 };
      const fs = firestore();
      const batch = fs.batch();
      const payload = serializeForFirestore({ ...data, updatedAt: nowDate() });
      delete (payload as any).id;
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k];
      }
      for (const d of docs) {
        batch.update(fs.collection(colName).doc(d.id), payload);
      }
      await batch.commit();
      return { count: docs.length };
    },

    async delete(args: any = {}) {
      const { where } = args;
      const existing = await findUniqueDoc(where);
      if (!existing) throw new Error(`${model} not found for delete`);
      await firestore().collection(colName).doc(existing.id).delete();
      return existing;
    },

    async deleteMany(args: any = {}) {
      const { where } = args;
      const docs = await fetchAll(model, where);
      if (docs.length === 0) return { count: 0 };
      const fs = firestore();
      const batch = fs.batch();
      for (const d of docs) {
        batch.delete(fs.collection(colName).doc(d.id));
      }
      await batch.commit();
      return { count: docs.length };
    },

    async count(args: any = {}) {
      const { where } = args;
      const docs = await fetchAll(model, where);
      return docs.length;
    },

    async aggregate(args: any = {}) {
      const { where, _sum, _count, _avg } = args;
      const docs = await fetchAll(model, where);
      const result: any = {};
      if (_sum) {
        result._sum = {};
        for (const field of Object.keys(_sum)) {
          if (!_sum[field]) continue;
          result._sum[field] = docs.reduce((s, d) => s + (Number(d[field]) || 0), 0);
        }
      }
      if (_count) {
        if (_count === true) {
          result._count = docs.length;
        } else {
          result._count = {};
          for (const field of Object.keys(_count)) {
            if (!_count[field]) continue;
            result._count[field] = docs.filter((d) => d[field] !== null && d[field] !== undefined).length;
          }
        }
      }
      if (_avg) {
        result._avg = {};
        for (const field of Object.keys(_avg)) {
          if (!_avg[field]) continue;
          const vals = docs.map((d) => Number(d[field]) || 0);
          result._avg[field] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        }
      }
      return result;
    },

    // Only used by budgets route (composite unique userId+category+month+period)
    async upsert(args: any = {}) {
      const { where, create, update, select } = args;
      // Extract composite key if present
      let lookup: any = {};
      if (where?.userId_category_month_period) {
        lookup = { ...where.userId_category_month_period };
      } else {
        lookup = { ...where };
      }
      const existing = (await fetchAll(model, lookup)).find((d) => matchesWhere(d, lookup)) ?? null;
      if (existing) {
        return handler.update({ where: { id: existing.id }, data: update, select });
      }
      return handler.create({ data: create, select });
    },
  };

  return handler;
}

export const db = {
  user: createHandler("user"),
  income: createHandler("income"),
  expense: createHandler("expense"),
  budget: createHandler("budget"),
  savingsGoal: createHandler("savingsGoal"),
  aiChat: createHandler("aiChat"),
  prediction: createHandler("prediction"),
  notification: createHandler("notification"),
  bill: createHandler("bill"),
  investment: createHandler("investment"),
  achievement: createHandler("achievement"),
  challenge: createHandler("challenge"),
};
