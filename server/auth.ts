import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "motowarsztat-jwt-2024-secret-CHANGE-IN-PRODUCTION";
const JWT_EXPIRES = "7d";

export function signToken(userId: number, userRole: string): string {
  return jwt.sign({ userId, userRole }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): { userId: number; userRole: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; userRole: string };
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid token" });
  (req as any).userId = payload.userId;
  (req as any).userRole = payload.userRole;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: "Invalid token" });
    if (!roles.includes(payload.userRole)) return res.status(403).json({ error: "Forbidden" });
    (req as any).userId = payload.userId;
    (req as any).userRole = payload.userRole;
    next();
  };
}
