import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User, InsertUser,
  Vehicle, InsertVehicle,
  RepairOrder, InsertRepairOrder,
  QuoteItem, InsertQuoteItem,
  WorkEntry, InsertWorkEntry,
  Photo, InsertPhoto,
  Part, InsertPart,
  PartMovement, InsertPartMovement,
  Payment, InsertPayment,
} from "@shared/schema";

const dbPath = process.env.DATABASE_PATH || "motowarsztat.db";
const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
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

const now = () => new Date().toISOString();

export interface IStorage {
  // Users
  getUserById(id: number): User | undefined;
  getUserByEmail(email: string): User | undefined;
  createUser(data: InsertUser): User;
  getAllUsers(): User[];
  updateUser(id: number, data: Partial<InsertUser>): User | undefined;

  // Vehicles
  getVehicleById(id: number): Vehicle | undefined;
  getVehiclesByClient(clientId: number): Vehicle[];
  getAllVehicles(): Vehicle[];
  createVehicle(data: InsertVehicle): Vehicle;
  updateVehicle(id: number, data: Partial<InsertVehicle>): Vehicle | undefined;

  // Repair Orders
  getRepairOrderById(id: number): RepairOrder | undefined;
  getRepairOrdersByClient(clientId: number): RepairOrder[];
  getRepairOrdersByVehicle(vehicleId: number): RepairOrder[];
  getRepairOrdersByMechanic(mechanicId: number): RepairOrder[];
  getAllRepairOrders(): RepairOrder[];
  createRepairOrder(data: InsertRepairOrder): RepairOrder;
  updateRepairOrder(id: number, data: Partial<InsertRepairOrder>): RepairOrder | undefined;

  // Quote Items
  getQuoteItemsByOrder(repairOrderId: number): QuoteItem[];
  createQuoteItem(data: InsertQuoteItem): QuoteItem;
  deleteQuoteItem(id: number): void;
  deleteQuoteItemsByOrder(repairOrderId: number): void;

  // Work Entries
  getWorkEntriesByOrder(repairOrderId: number): WorkEntry[];
  createWorkEntry(data: InsertWorkEntry): WorkEntry;
  deleteWorkEntry(id: number): void;

  // Photos
  getPhotosByOrder(repairOrderId: number): Photo[];
  createPhoto(data: InsertPhoto): Photo;
  deletePhoto(id: number): Photo | undefined;

  // Parts
  getAllParts(): Part[];
  getPartById(id: number): Part | undefined;
  createPart(data: InsertPart): Part;
  updatePart(id: number, data: Partial<InsertPart>): Part | undefined;
  deletePart(id: number): void;
  getMovementsByPart(partId: number): PartMovement[];
  getAllMovements(): PartMovement[];
  createPartMovement(data: InsertPartMovement): PartMovement;

  // Payments
  getPaymentsByOrder(repairOrderId: number): Payment[];
  getAllPayments(): Payment[];
  createPayment(data: InsertPayment): Payment;
}

export class SqliteStorage implements IStorage {
  getUserById(id: number) {
    return db.select().from(schema.users).where(eq(schema.users.id, id)).get();
  }
  getUserByEmail(email: string) {
    return db.select().from(schema.users).where(eq(schema.users.email, email)).get();
  }
  createUser(data: InsertUser): User {
    return db.insert(schema.users).values({ ...data, createdAt: now() }).returning().get();
  }
  getAllUsers() {
    return db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).all();
  }
  updateUser(id: number, data: Partial<InsertUser>) {
    return db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning().get();
  }

  getVehicleById(id: number) {
    return db.select().from(schema.vehicles).where(eq(schema.vehicles.id, id)).get();
  }
  getVehiclesByClient(clientId: number) {
    return db.select().from(schema.vehicles).where(eq(schema.vehicles.clientId, clientId)).all();
  }
  getAllVehicles() {
    return db.select().from(schema.vehicles).all();
  }
  createVehicle(data: InsertVehicle): Vehicle {
    return db.insert(schema.vehicles).values({ ...data, createdAt: now() }).returning().get();
  }
  updateVehicle(id: number, data: Partial<InsertVehicle>) {
    return db.update(schema.vehicles).set(data).where(eq(schema.vehicles.id, id)).returning().get();
  }

  getRepairOrderById(id: number) {
    return db.select().from(schema.repairOrders).where(eq(schema.repairOrders.id, id)).get();
  }
  getRepairOrdersByClient(clientId: number) {
    return db.select().from(schema.repairOrders).where(eq(schema.repairOrders.clientId, clientId)).orderBy(desc(schema.repairOrders.createdAt)).all();
  }
  getRepairOrdersByVehicle(vehicleId: number) {
    return db.select().from(schema.repairOrders).where(eq(schema.repairOrders.vehicleId, vehicleId)).orderBy(desc(schema.repairOrders.createdAt)).all();
  }
  getRepairOrdersByMechanic(mechanicId: number) {
    return db.select().from(schema.repairOrders).where(eq(schema.repairOrders.mechanicId, mechanicId)).orderBy(desc(schema.repairOrders.createdAt)).all();
  }
  getAllRepairOrders() {
    return db.select().from(schema.repairOrders).orderBy(desc(schema.repairOrders.createdAt)).all();
  }
  createRepairOrder(data: InsertRepairOrder): RepairOrder {
    return db.insert(schema.repairOrders).values({ ...data, createdAt: now() }).returning().get();
  }
  updateRepairOrder(id: number, data: Partial<InsertRepairOrder>) {
    return db.update(schema.repairOrders).set(data).where(eq(schema.repairOrders.id, id)).returning().get();
  }

  getQuoteItemsByOrder(repairOrderId: number) {
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

  getWorkEntriesByOrder(repairOrderId: number) {
    return db.select().from(schema.workEntries).where(eq(schema.workEntries.repairOrderId, repairOrderId)).orderBy(desc(schema.workEntries.createdAt)).all();
  }
  createWorkEntry(data: InsertWorkEntry): WorkEntry {
    return db.insert(schema.workEntries).values({ ...data, createdAt: now() }).returning().get();
  }
  deleteWorkEntry(id: number) {
    db.delete(schema.workEntries).where(eq(schema.workEntries.id, id)).run();
  }

  getPhotosByOrder(repairOrderId: number) {
    return db.select().from(schema.photos).where(eq(schema.photos.repairOrderId, repairOrderId)).all();
  }
  createPhoto(data: InsertPhoto): Photo {
    return db.insert(schema.photos).values({ ...data, createdAt: now() }).returning().get();
  }
  deletePhoto(id: number) {
    const photo = db.select().from(schema.photos).where(eq(schema.photos.id, id)).get();
    db.delete(schema.photos).where(eq(schema.photos.id, id)).run();
    return photo;
  }

  // Parts
  getAllParts() {
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
  getMovementsByPart(partId: number) {
    return db.select().from(schema.partMovements).where(eq(schema.partMovements.partId, partId)).orderBy(desc(schema.partMovements.createdAt)).all();
  }
  getAllMovements() {
    return db.select().from(schema.partMovements).orderBy(desc(schema.partMovements.createdAt)).all();
  }
  createPartMovement(data: InsertPartMovement): PartMovement {
    const mv = db.insert(schema.partMovements).values({ ...data, createdAt: now() }).returning().get();
    // update stock
    const part = this.getPartById(data.partId);
    if (part) {
      const delta = data.type === "in" ? data.qty : data.type === "out" ? -data.qty : data.qty - part.stockQty;
      const newQty = data.type === "adjustment" ? data.qty : part.stockQty + delta;
      db.update(schema.parts).set({ stockQty: Math.max(0, newQty) }).where(eq(schema.parts.id, data.partId)).run();
    }
    return mv;
  }

  getPaymentsByOrder(repairOrderId: number) {
    return db.select().from(schema.payments).where(eq(schema.payments.repairOrderId, repairOrderId)).all();
  }
  getAllPayments() {
    return db.select().from(schema.payments).orderBy(desc(schema.payments.createdAt)).all();
  }
  createPayment(data: InsertPayment): Payment {
    return db.insert(schema.payments).values({ ...data, createdAt: now() }).returning().get();
  }
}

export const storage = new SqliteStorage();
