import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User, InsertUser,
  Vehicle, InsertVehicle,
  RepairOrder, InsertRepairOrder,
  QuoteItem, InsertQuoteItem,
  WorkEntry, InsertWorkEntry,
  Comment, InsertComment,
  Task, InsertTask,
  Photo, InsertPhoto,
  Part, InsertPart,
  PartMovement, InsertPartMovement,
  Payment, InsertPayment,
} from "@shared/schema";

const dbPath = process.env.DATABASE_PATH || "motowarsztat.db";
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    vin TEXT,
    license_plate TEXT,
    engine_size TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS repair_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    client_id INTEGER NOT NULL REFERENCES users(id),
    mechanic_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT NOT NULL DEFAULT 'normal',
    mileage INTEGER,
    client_notes TEXT,
    mechanic_notes TEXT,
    estimated_completion_date TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quote_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_order_id INTEGER NOT NULL REFERENCES repair_orders(id),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS work_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_order_id INTEGER NOT NULL REFERENCES repair_orders(id),
    mechanic_id INTEGER NOT NULL REFERENCES users(id),
    description TEXT NOT NULL,
    hours_spent REAL,
    parts_used TEXT,
    cost REAL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_order_id INTEGER NOT NULL REFERENCES repair_orders(id),
    author_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_order_id INTEGER REFERENCES repair_orders(id),
    assigned_to INTEGER NOT NULL REFERENCES users(id),
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    done_note TEXT,
    done_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_order_id INTEGER NOT NULL REFERENCES repair_orders(id),
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    caption TEXT,
    phase TEXT NOT NULL DEFAULT 'before',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    catalog_number TEXT,
    brand TEXT,
    category TEXT,
    unit TEXT NOT NULL DEFAULT 'szt',
    stock_qty REAL NOT NULL DEFAULT 0,
    min_qty REAL NOT NULL DEFAULT 1,
    buy_price REAL,
    sell_price REAL,
    location TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS part_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id INTEGER NOT NULL REFERENCES parts(id),
    repair_order_id INTEGER REFERENCES repair_orders(id),
    type TEXT NOT NULL,
    qty REAL NOT NULL,
    price REAL,
    note TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_order_id INTEGER NOT NULL REFERENCES repair_orders(id),
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    notes TEXT,
    paid_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

`);

// Ignoruj błąd "duplicate column" przy migracji
// Migracje bezpieczne
try { sqlite.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`); } catch {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN phone TEXT`); } catch {}
try { sqlite.exec(`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, repair_order_id INTEGER NOT NULL REFERENCES repair_orders(id), author_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'public', created_at TEXT NOT NULL)`); } catch {}
try { sqlite.exec(`CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, repair_order_id INTEGER REFERENCES repair_orders(id), assigned_to INTEGER NOT NULL REFERENCES users(id), assigned_by INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT, due_date TEXT, status TEXT NOT NULL DEFAULT 'pending', done_note TEXT, done_at TEXT, created_at TEXT NOT NULL)`); } catch {}
// Aktywuj istniejących ownerów / mechaników bez statusu
try { sqlite.exec(`UPDATE users SET status = 'active' WHERE (status IS NULL OR status = '' OR status = 'pending') AND role = 'owner'`); } catch {}

const now = () => new Date().toISOString();

export class SqliteStorage {
  // ─── Users ─────────────────────────────────────────────────────────────
  getUserById(id: number) {
    return db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  }
  getUserByEmail(email: string) {
    return db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  }
  createUser(data: InsertUser): User {
    return db.insert(schema.users).values({ ...data, createdAt: now() }).returning().get();
  }
  getAllUsers(): User[] {
    return db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).all();
  }
  updateUser(id: number, data: Partial<InsertUser>) {
    return db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning().get();
  }
  getPendingUsers(): User[] {
    return db.select().from(schema.users).where(eq(schema.users.status, "pending")).all();
  }

  // ─── Vehicles ───────────────────────────────────────────────────────────
  getVehicleById(id: number) {
    return db.select().from(schema.vehicles).where(eq(schema.vehicles.id, id)).get();
  }
  getVehiclesByClient(clientId: number): Vehicle[] {
    return db.select().from(schema.vehicles).where(eq(schema.vehicles.clientId, clientId)).all();
  }
  getAllVehicles(): Vehicle[] {
    return db.select().from(schema.vehicles).orderBy(desc(schema.vehicles.createdAt)).all();
  }
  createVehicle(data: InsertVehicle): Vehicle {
    return db.insert(schema.vehicles).values({ ...data, createdAt: now() }).returning().get();
  }
  updateVehicle(id: number, data: Partial<InsertVehicle>) {
    return db.update(schema.vehicles).set(data).where(eq(schema.vehicles.id, id)).returning().get();
  }

  // ─── Repair Orders ──────────────────────────────────────────────────────
  getRepairOrderById(id: number) {
    return db.select().from(schema.repairOrders).where(eq(schema.repairOrders.id, id)).get();
  }
  getRepairOrdersByClient(clientId: number): RepairOrder[] {
    return db.select().from(schema.repairOrders)
      .where(eq(schema.repairOrders.clientId, clientId))
      .orderBy(desc(schema.repairOrders.createdAt)).all();
  }
  getRepairOrdersByVehicle(vehicleId: number): RepairOrder[] {
    return db.select().from(schema.repairOrders)
      .where(eq(schema.repairOrders.vehicleId, vehicleId))
      .orderBy(desc(schema.repairOrders.createdAt)).all();
  }
  getAllRepairOrders(): RepairOrder[] {
    return db.select().from(schema.repairOrders).orderBy(desc(schema.repairOrders.createdAt)).all();
  }
  createRepairOrder(data: InsertRepairOrder): RepairOrder {
    return db.insert(schema.repairOrders).values({ ...data, createdAt: now() }).returning().get();
  }
  updateRepairOrder(id: number, data: Partial<InsertRepairOrder>) {
    return db.update(schema.repairOrders).set(data).where(eq(schema.repairOrders.id, id)).returning().get();
  }

  // ─── Quote Items ────────────────────────────────────────────────────────
  getQuoteItemsByOrder(repairOrderId: number): QuoteItem[] {
    return db.select().from(schema.quoteItems).where(eq(schema.quoteItems.repairOrderId, repairOrderId)).all();
  }
  createQuoteItem(data: InsertQuoteItem): QuoteItem {
    return db.insert(schema.quoteItems).values({ ...data, createdAt: now() }).returning().get();
  }
  deleteQuoteItem(id: number) {
    db.delete(schema.quoteItems).where(eq(schema.quoteItems.id, id)).run();
  }
  deleteQuoteItemsByOrder(repairOrderId: number) {
    db.delete(schema.quoteItems).where(eq(schema.quoteItems.repairOrderId, repairOrderId)).run();
  }

  // ─── Work Entries ───────────────────────────────────────────────────────
  getWorkEntriesByOrder(repairOrderId: number): WorkEntry[] {
    return db.select().from(schema.workEntries)
      .where(eq(schema.workEntries.repairOrderId, repairOrderId))
      .orderBy(desc(schema.workEntries.createdAt)).all();
  }
  createWorkEntry(data: InsertWorkEntry): WorkEntry {
    return db.insert(schema.workEntries).values({ ...data, createdAt: now() }).returning().get();
  }
  deleteWorkEntry(id: number) {
    db.delete(schema.workEntries).where(eq(schema.workEntries.id, id)).run();
  }

  // ─── Comments ───────────────────────────────────────────────────────────
  getCommentsByOrder(repairOrderId: number, includePrivate: boolean): Comment[] {
    if (includePrivate) {
      return db.select().from(schema.comments)
        .where(eq(schema.comments.repairOrderId, repairOrderId))
        .orderBy(schema.comments.createdAt).all();
    }
    return db.select().from(schema.comments)
      .where(and(
        eq(schema.comments.repairOrderId, repairOrderId),
        eq(schema.comments.visibility, "public")
      ))
      .orderBy(schema.comments.createdAt).all();
  }
  createComment(data: InsertComment): Comment {
    return db.insert(schema.comments).values({ ...data, createdAt: now() }).returning().get();
  }
  deleteComment(id: number) {
    db.delete(schema.comments).where(eq(schema.comments.id, id)).run();
  }

  // ─── Tasks ──────────────────────────────────────────────────────────────
  getTasksByAssignee(userId: number): Task[] {
    return db.select().from(schema.tasks)
      .where(eq(schema.tasks.assignedTo, userId))
      .orderBy(desc(schema.tasks.createdAt)).all();
  }
  getAllTasks(): Task[] {
    return db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt)).all();
  }
  getTasksByOrder(repairOrderId: number): Task[] {
    return db.select().from(schema.tasks)
      .where(eq(schema.tasks.repairOrderId, repairOrderId)).all();
  }
  createTask(data: InsertTask): Task {
    return db.insert(schema.tasks).values({ ...data, createdAt: now() }).returning().get();
  }
  updateTask(id: number, data: Partial<InsertTask> & { doneAt?: string }): Task | undefined {
    return db.update(schema.tasks).set(data).where(eq(schema.tasks.id, id)).returning().get();
  }
  deleteTask(id: number) {
    db.delete(schema.tasks).where(eq(schema.tasks.id, id)).run();
  }
  getTodayTasks(userId: number): Task[] {
    const today = new Date().toISOString().slice(0, 10);
    return db.select().from(schema.tasks)
      .where(and(eq(schema.tasks.assignedTo, userId), eq(schema.tasks.dueDate, today)))
      .orderBy(schema.tasks.status).all();
  }

  // ─── Photos ─────────────────────────────────────────────────────────────
  getPhotosByOrder(repairOrderId: number): Photo[] {
    return db.select().from(schema.photos).where(eq(schema.photos.repairOrderId, repairOrderId)).all();
  }
  createPhoto(data: InsertPhoto): Photo {
    return db.insert(schema.photos).values({ ...data, createdAt: now() }).returning().get();
  }
  deletePhoto(id: number): Photo | undefined {
    const photo = db.select().from(schema.photos).where(eq(schema.photos.id, id)).get();
    db.delete(schema.photos).where(eq(schema.photos.id, id)).run();
    return photo;
  }

  // ─── Parts ──────────────────────────────────────────────────────────────
  getAllParts(): Part[] {
    return db.select().from(schema.parts).orderBy(schema.parts.name).all();
  }
  getPartById(id: number) {
    return db.select().from(schema.parts).where(eq(schema.parts.id, id)).get();
  }
  createPart(data: InsertPart): Part {
    return db.insert(schema.parts).values({ ...data, createdAt: now() }).returning().get();
  }
  updatePart(id: number, data: Partial<InsertPart>) {
    return db.update(schema.parts).set(data).where(eq(schema.parts.id, id)).returning().get();
  }
  deletePart(id: number) {
    db.delete(schema.parts).where(eq(schema.parts.id, id)).run();
  }
  getMovementsByPart(partId: number): PartMovement[] {
    return db.select().from(schema.partMovements)
      .where(eq(schema.partMovements.partId, partId))
      .orderBy(desc(schema.partMovements.createdAt)).all();
  }
  getAllMovements(): PartMovement[] {
    return db.select().from(schema.partMovements).orderBy(desc(schema.partMovements.createdAt)).all();
  }
  createPartMovement(data: InsertPartMovement): PartMovement {
    const mv = db.insert(schema.partMovements).values({ ...data, createdAt: now() }).returning().get();
    const part = this.getPartById(data.partId);
    if (part) {
      const newQty = data.type === "adjustment"
        ? data.qty
        : data.type === "in"
          ? part.stockQty + data.qty
          : Math.max(0, part.stockQty - data.qty);
      db.update(schema.parts).set({ stockQty: newQty }).where(eq(schema.parts.id, data.partId)).run();
    }
    return mv;
  }

  // ─── Payments ───────────────────────────────────────────────────────────
  getPaymentsByOrder(repairOrderId: number): Payment[] {
    return db.select().from(schema.payments).where(eq(schema.payments.repairOrderId, repairOrderId)).all();
  }
  getAllPayments(): Payment[] {
    return db.select().from(schema.payments).orderBy(desc(schema.payments.createdAt)).all();
  }
  createPayment(data: InsertPayment): Payment {
    return db.insert(schema.payments).values({ ...data, createdAt: now() }).returning().get();
  }
}

export const storage = new SqliteStorage();
