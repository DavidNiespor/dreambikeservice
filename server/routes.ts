import type { Express, Request, Response, NextFunction } from "express";
import { Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { signToken, requireAuth, requireRole } from "./auth";

const uploadsDir = process.env.UPLOADS_PATH || path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

const uid = (req: Request) => (req as any).userId as number;
const role = (req: Request) => (req as any).userRole as string;

// Middleware: blokuj zawieszonych/niezatwierdzonych użytkowników
function requireActive(req: Request, res: Response, next: NextFunction) {
  const user = storage.getUserById(uid(req));
  if (!user) return res.status(401).json({ error: "User not found" });
  if (user.status === "pending") return res.status(403).json({ error: "ACCOUNT_PENDING", message: "Konto czeka na zatwierdzenie przez właściciela warsztatu." });
  if (user.status === "blocked") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Konto zostało zablokowane." });
  next();
}

export function registerRoutes(httpServer: Server, app: Express) {
  app.use("/uploads", (req, res) => {
    res.sendFile(path.join(uploadsDir, req.path), (err) => {
      if (err) res.status(404).json({ error: "Not found" });
    });
  });

  // ===== AUTH =====
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, phone, password, role: r } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: "Brakujące pola" });
      const existing = storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ error: "Email już istnieje" });
      const hashed = await bcrypt.hash(password, 10);
      const allowedRole = ["owner", "mechanic", "client"].includes(r) ? r : "client";
      // Owner zawsze aktywny od razu; reszta czeka na zatwierdzenie
      const status = allowedRole === "owner" ? "active" : "pending";
      const user = storage.createUser({ name, email, phone, password: hashed, role: allowedRole, status });
      if (user.status !== "active") {
        return res.json({ pendingApproval: true, message: "Konto założone. Poczekaj na zatwierdzenie przez właściciela warsztatu." });
      }
      const token = signToken(user.id, user.role);
      res.json({ token, id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
      if (user.status === "pending") return res.status(403).json({ error: "ACCOUNT_PENDING", message: "Konto czeka na zatwierdzenie przez właściciela warsztatu." });
      if (user.status === "blocked") return res.status(403).json({ error: "ACCOUNT_BLOCKED", message: "Konto zostało zablokowane." });
      const token = signToken(user.id, user.role);
      res.json({ token, id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/me", requireAuth, requireActive, (req, res) => {
    const user = storage.getUserById(uid(req));
    if (!user) return res.status(401).json({ error: "Not found" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
  });

  // ===== USERS =====
  app.get("/api/users", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    res.json(storage.getAllUsers().map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      phone: u.phone, status: u.status, createdAt: u.createdAt,
    })));
  });

  // Zatwierdzanie / blokowanie kont (owner only)
  app.patch("/api/users/:id/status", requireAuth, requireActive, requireRole("owner"), (req, res) => {
    const { status } = req.body;
    if (!["active", "blocked", "pending"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    const user = storage.updateUser(Number(req.params.id), { status });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({ id: user.id, name: user.name, status: user.status });
  });

  app.patch("/api/users/:id", requireAuth, requireActive, requireRole("owner"), (req, res) => {
    const user = storage.updateUser(Number(req.params.id), req.body);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, status: user.status });
  });

  // ===== VEHICLES =====
  app.get("/api/vehicles", requireAuth, requireActive, (req, res) => {
    // Klient widzi TYLKO swoje pojazdy
    if (role(req) === "client") return res.json(storage.getVehiclesByClient(uid(req)));
    return res.json(storage.getAllVehicles());
  });

  app.get("/api/vehicles/:id", requireAuth, requireActive, (req, res) => {
    const v = storage.getVehicleById(Number(req.params.id));
    if (!v) return res.status(404).json({ error: "Not found" });
    // Klient może widzieć tylko swój pojazd
    if (role(req) === "client" && v.clientId !== uid(req)) return res.status(403).json({ error: "Forbidden" });
    res.json(v);
  });

  app.post("/api/vehicles", requireAuth, requireActive, (req, res) => {
    const clientId = role(req) === "client" ? uid(req) : (req.body.clientId || uid(req));
    const v = storage.createVehicle({ ...req.body, clientId });
    res.json(v);
  });

  app.patch("/api/vehicles/:id", requireAuth, requireActive, (req, res) => {
    const v = storage.updateVehicle(Number(req.params.id), req.body);
    if (!v) return res.status(404).json({ error: "Not found" });
    res.json(v);
  });

  // ===== REPAIR ORDERS =====
  app.get("/api/orders", requireAuth, requireActive, (req, res) => {
    // Klient widzi TYLKO swoje zlecenia
    if (role(req) === "client") return res.json(storage.getRepairOrdersByClient(uid(req)));
    return res.json(storage.getAllRepairOrders());
  });

  app.get("/api/orders/:id", requireAuth, requireActive, (req, res) => {
    const order = storage.getRepairOrderById(Number(req.params.id));
    if (!order) return res.status(404).json({ error: "Not found" });
    // Klient może widzieć tylko swoje zlecenie
    if (role(req) === "client" && order.clientId !== uid(req)) return res.status(403).json({ error: "Forbidden" });
    res.json(order);
  });

  app.post("/api/orders", requireAuth, requireActive, (req, res) => {
    const clientId = role(req) === "client" ? uid(req) : req.body.clientId;
    const order = storage.createRepairOrder({ ...req.body, clientId });
    res.json(order);
  });

  app.patch("/api/orders/:id", requireAuth, requireActive, (req, res) => {
    const order = storage.getRepairOrderById(Number(req.params.id));
    if (!order) return res.status(404).json({ error: "Not found" });
    if (role(req) === "client") {
      const allowed = ["quote_accepted", "quote_rejected"];
      if (req.body.status && !allowed.includes(req.body.status)) return res.status(403).json({ error: "Forbidden" });
    }
    const updated = storage.updateRepairOrder(Number(req.params.id), req.body);
    res.json(updated);
  });

  app.get("/api/vehicles/:id/orders", requireAuth, requireActive, (req, res) => {
    const v = storage.getVehicleById(Number(req.params.id));
    if (!v) return res.status(404).json({ error: "Not found" });
    if (role(req) === "client" && v.clientId !== uid(req)) return res.status(403).json({ error: "Forbidden" });
    res.json(storage.getRepairOrdersByVehicle(Number(req.params.id)));
  });

  // ===== QUOTE ITEMS =====
  app.get("/api/orders/:id/quotes", requireAuth, requireActive, (req, res) => {
    res.json(storage.getQuoteItemsByOrder(Number(req.params.id)));
  });
  app.post("/api/orders/:id/quotes", requireAuth, requireActive, requireRole("mechanic", "owner"), (req, res) => {
    const item = storage.createQuoteItem({ ...req.body, repairOrderId: Number(req.params.id) });
    storage.updateRepairOrder(Number(req.params.id), { status: "quoted" });
    res.json(item);
  });
  app.delete("/api/quotes/:id", requireAuth, requireActive, requireRole("mechanic", "owner"), (req, res) => {
    storage.deleteQuoteItem(Number(req.params.id));
    res.json({ ok: true });
  });
  app.delete("/api/orders/:id/quotes", requireAuth, requireActive, requireRole("mechanic", "owner"), (req, res) => {
    storage.deleteQuoteItemsByOrder(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== WORK ENTRIES =====
  app.get("/api/orders/:id/work", requireAuth, requireActive, (req, res) => {
    res.json(storage.getWorkEntriesByOrder(Number(req.params.id)));
  });
  app.post("/api/orders/:id/work", requireAuth, requireActive, requireRole("mechanic", "owner"), (req, res) => {
    const entry = storage.createWorkEntry({ ...req.body, repairOrderId: Number(req.params.id), mechanicId: uid(req) });
    res.json(entry);
  });
  app.delete("/api/work/:id", requireAuth, requireActive, requireRole("mechanic", "owner"), (req, res) => {
    storage.deleteWorkEntry(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== COMMENTS =====
  app.get("/api/orders/:id/comments", requireAuth, requireActive, (req, res) => {
    const includePrivate = role(req) !== "client";
    res.json(storage.getCommentsByOrder(Number(req.params.id), includePrivate));
  });
  app.post("/api/orders/:id/comments", requireAuth, requireActive, (req, res) => {
    const r = role(req);
    // Klient może pisać tylko publiczne
    const visibility = r === "client" ? "public" : (req.body.visibility || "public");
    const comment = storage.createComment({
      repairOrderId: Number(req.params.id),
      authorId: uid(req),
      content: req.body.content,
      visibility,
    });
    res.json(comment);
  });
  app.delete("/api/comments/:id", requireAuth, requireActive, (req, res) => {
    storage.deleteComment(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== TASKS =====
  // Wszystkie zadania (owner widzi wszystkie, mechanik swoje)
  app.get("/api/tasks", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    if (role(req) === "owner") return res.json(storage.getAllTasks());
    return res.json(storage.getTasksByAssignee(uid(req)));
  });
  // Zadania dla zlecenia
  app.get("/api/orders/:id/tasks", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    res.json(storage.getTasksByOrder(Number(req.params.id)));
  });
  // Dzisiejsze zadania mechanika
  app.get("/api/tasks/today", requireAuth, requireActive, requireRole("mechanic", "owner"), (req, res) => {
    const userId = role(req) === "owner" ? (req.query.userId ? Number(req.query.userId) : uid(req)) : uid(req);
    res.json(storage.getTodayTasks(userId));
  });
  // Utwórz zadanie
  app.post("/api/tasks", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    const task = storage.createTask({ ...req.body, assignedBy: uid(req) });
    res.json(task);
  });
  // Aktualizuj zadanie (mechanik może tylko odznaczać swoje; owner może wszystko)
  app.patch("/api/tasks/:id", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    const task = storage.getAllTasks().find(t => t.id === Number(req.params.id));
    if (!task) return res.status(404).json({ error: "Not found" });
    // Mechanik może aktualizować tylko swoje zadania
    if (role(req) === "mechanic" && task.assignedTo !== uid(req)) return res.status(403).json({ error: "Forbidden" });
    const updates: any = { ...req.body };
    if (req.body.status === "done" && !task.doneAt) {
      updates.doneAt = new Date().toISOString();
    }
    const updated = storage.updateTask(Number(req.params.id), updates);
    res.json(updated);
  });
  app.delete("/api/tasks/:id", requireAuth, requireActive, requireRole("owner"), (req, res) => {
    storage.deleteTask(Number(req.params.id));
    res.json({ ok: true });
  });

  // ===== PHOTOS =====
  app.get("/api/orders/:id/photos", requireAuth, requireActive, (req, res) => {
    res.json(storage.getPhotosByOrder(Number(req.params.id)));
  });
  app.post("/api/orders/:id/photos", requireAuth, requireActive, upload.single("photo"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const photo = storage.createPhoto({
      repairOrderId: Number(req.params.id),
      uploadedBy: uid(req),
      filename: req.file.filename,
      originalName: req.file.originalname,
      caption: req.body.caption,
      phase: req.body.phase || "before",
    });
    res.json(photo);
  });
  app.delete("/api/photos/:id", requireAuth, requireActive, (req, res) => {
    const photo = storage.deletePhoto(Number(req.params.id));
    if (photo) {
      const fp = path.join(uploadsDir, photo.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    res.json({ ok: true });
  });

  // ===== PARTS =====
  app.get("/api/parts", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    res.json(storage.getAllParts());
  });
  app.post("/api/parts", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    res.json(storage.createPart(req.body));
  });
  app.patch("/api/parts/:id", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    const part = storage.updatePart(Number(req.params.id), req.body);
    if (!part) return res.status(404).json({ error: "Not found" });
    res.json(part);
  });
  app.delete("/api/parts/:id", requireAuth, requireActive, requireRole("owner"), (req, res) => {
    storage.deletePart(Number(req.params.id));
    res.json({ ok: true });
  });
  app.get("/api/parts/:id/movements", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    res.json(storage.getMovementsByPart(Number(req.params.id)));
  });
  app.post("/api/parts/:id/movements", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    res.json(storage.createPartMovement({ ...req.body, partId: Number(req.params.id), createdBy: uid(req) }));
  });
  app.get("/api/movements", requireAuth, requireActive, requireRole("owner"), (req, res) => {
    res.json(storage.getAllMovements());
  });

  // ===== PAYMENTS =====
  app.get("/api/orders/:id/payments", requireAuth, requireActive, (req, res) => {
    res.json(storage.getPaymentsByOrder(Number(req.params.id)));
  });
  app.post("/api/orders/:id/payments", requireAuth, requireActive, requireRole("owner", "mechanic"), (req, res) => {
    const payment = storage.createPayment({ ...req.body, repairOrderId: Number(req.params.id), paidAt: new Date().toISOString() });
    storage.updateRepairOrder(Number(req.params.id), { status: "paid" });
    res.json(payment);
  });
  app.get("/api/payments", requireAuth, requireActive, requireRole("owner"), (req, res) => {
    res.json(storage.getAllPayments());
  });

  // ===== MONTHLY REPORT =====
  app.get("/api/reports/monthly", requireAuth, requireActive, requireRole("owner"), (req, res) => {
    const { year, month } = req.query;
    const orders = storage.getAllRepairOrders();
    const payments = storage.getAllPayments();
    const movements = storage.getAllMovements();
    const parts = storage.getAllParts();

    const filterDate = (dateStr: string) => {
      if (!year && !month) return true;
      const d = new Date(dateStr);
      return (year ? d.getFullYear() === Number(year) : true) && (month ? d.getMonth() + 1 === Number(month) : true);
    };

    const filteredPayments = payments.filter(p => filterDate(p.paidAt));
    const filteredOrders = orders.filter(o => filterDate(o.createdAt));
    const filteredOut = movements.filter(m => m.type === "out" && filterDate(m.createdAt));
    const filteredIn = movements.filter(m => m.type === "in" && filterDate(m.createdAt));

    const revenue = filteredPayments.reduce((s, p) => s + p.amount, 0);
    const partsCostOut = filteredOut.reduce((s, m) => s + (m.qty * (m.price || 0)), 0);
    const byStatus: Record<string, number> = {};
    filteredOrders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    const lowStock = parts.filter(p => p.stockQty <= p.minQty);
    const dailyRevenue: Record<string, number> = {};
    filteredPayments.forEach(p => { const d = p.paidAt.slice(0, 10); dailyRevenue[d] = (dailyRevenue[d] || 0) + p.amount; });
    const partUsage: Record<number, { name: string; qty: number; cost: number }> = {};
    filteredOut.forEach(m => {
      const p = parts.find(p => p.id === m.partId);
      if (!p) return;
      if (!partUsage[m.partId]) partUsage[m.partId] = { name: p.name, qty: 0, cost: 0 };
      partUsage[m.partId].qty += m.qty;
      partUsage[m.partId].cost += m.qty * (m.price || 0);
    });

    res.json({
      period: { year: Number(year) || new Date().getFullYear(), month: Number(month) || new Date().getMonth() + 1 },
      summary: { revenue, partsCostOut, partsCostIn: filteredIn.reduce((s, m) => s + (m.qty * (m.price || 0)), 0), margin: revenue - partsCostOut, ordersCount: filteredOrders.length, paidCount: filteredPayments.length },
      byStatus, dailyRevenue,
      topParts: Object.values(partUsage).sort((a, b) => b.qty - a.qty).slice(0, 10),
      lowStock: lowStock.map(p => ({ id: p.id, name: p.name, stockQty: p.stockQty, minQty: p.minQty, unit: p.unit })),
      payments: filteredPayments,
    });
  });

  // ===== STATS =====
  app.get("/api/stats", requireAuth, requireActive, requireRole("owner"), (req, res) => {
    const orders = storage.getAllRepairOrders();
    const payments = storage.getAllPayments();
    const users = storage.getAllUsers();
    const vehicles = storage.getAllVehicles();
    const byStatus: Record<string, number> = {};
    orders.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });
    res.json({
      totalOrders: orders.length,
      totalRevenue: payments.reduce((s, p) => s + p.amount, 0),
      totalClients: users.filter(u => u.role === "client").length,
      totalVehicles: vehicles.length,
      pendingApprovals: users.filter(u => u.status === "pending").length,
      byStatus,
    });
  });
}
