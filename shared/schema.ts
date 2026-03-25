import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  password: text("password").notNull(),
  role: text("role", { enum: ["owner", "mechanic", "client"] }).notNull().default("client"),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Vehicles
export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => users.id),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  vin: text("vin"),
  licensePlate: text("license_plate"),
  engineSize: text("engine_size"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Repair Orders
export const repairOrders = sqliteTable("repair_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  mechanicId: integer("mechanic_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status", {
    enum: ["pending", "quoted", "quote_accepted", "quote_rejected", "in_progress", "completed", "paid"],
  }).notNull().default("pending"),
  priority: text("priority", { enum: ["low", "normal", "high", "urgent"] }).notNull().default("normal"),
  mileage: integer("mileage"),
  clientNotes: text("client_notes"),
  mechanicNotes: text("mechanic_notes"),
  estimatedCompletionDate: text("estimated_completion_date"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

export const insertRepairOrderSchema = createInsertSchema(repairOrders).omit({ id: true, createdAt: true, completedAt: true });
export type InsertRepairOrder = z.infer<typeof insertRepairOrderSchema>;
export type RepairOrder = typeof repairOrders.$inferSelect;

// Quote Items
export const quoteItems = sqliteTable("quote_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairOrderId: integer("repair_order_id").notNull().references(() => repairOrders.id),
  type: text("type", { enum: ["labor", "part"] }).notNull(),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({ id: true, createdAt: true });
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

// Work Entries (completed work log)
export const workEntries = sqliteTable("work_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairOrderId: integer("repair_order_id").notNull().references(() => repairOrders.id),
  mechanicId: integer("mechanic_id").notNull().references(() => users.id),
  description: text("description").notNull(),
  hoursSpent: real("hours_spent"),
  partsUsed: text("parts_used"), // JSON text
  cost: real("cost"),
  createdAt: text("created_at").notNull(),
});

export const insertWorkEntrySchema = createInsertSchema(workEntries).omit({ id: true, createdAt: true });
export type InsertWorkEntry = z.infer<typeof insertWorkEntrySchema>;
export type WorkEntry = typeof workEntries.$inferSelect;

// Photos
export const photos = sqliteTable("photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairOrderId: integer("repair_order_id").notNull().references(() => repairOrders.id),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  caption: text("caption"),
  phase: text("phase", { enum: ["before", "during", "after"] }).notNull().default("before"),
  createdAt: text("created_at").notNull(),
});

export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true, createdAt: true });
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;

// Parts inventory
export const parts = sqliteTable("parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  catalogNumber: text("catalog_number"),
  brand: text("brand"),
  category: text("category"),
  unit: text("unit").notNull().default("szt"),
  stockQty: real("stock_qty").notNull().default(0),
  minQty: real("min_qty").notNull().default(1),  // alert poniżej
  buyPrice: real("buy_price"),   // cena zakupu
  sellPrice: real("sell_price"), // cena sprzedaży klientowi
  location: text("location"),    // miejsce w magazynie np. "Półka A3"
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const insertPartSchema = createInsertSchema(parts).omit({ id: true, createdAt: true });
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof parts.$inferSelect;

// Parts movements (wydania / przyjęcia)
export const partMovements = sqliteTable("part_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull().references(() => parts.id),
  repairOrderId: integer("repair_order_id").references(() => repairOrders.id),
  type: text("type", { enum: ["in", "out", "adjustment"] }).notNull(),
  qty: real("qty").notNull(),
  price: real("price"),          // cena jednostkowa przy ruchu
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: text("created_at").notNull(),
});

export const insertPartMovementSchema = createInsertSchema(partMovements).omit({ id: true, createdAt: true });
export type InsertPartMovement = z.infer<typeof insertPartMovementSchema>;
export type PartMovement = typeof partMovements.$inferSelect;

// Payments
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  repairOrderId: integer("repair_order_id").notNull().references(() => repairOrders.id),
  amount: real("amount").notNull(),
  method: text("method", { enum: ["cash", "card", "transfer"] }).notNull(),
  notes: text("notes"),
  paidAt: text("paid_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
