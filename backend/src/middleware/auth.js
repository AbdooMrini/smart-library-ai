import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import env from "../config/env.js";

export async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "Authentification requise." });
    const payload = jwt.verify(token, env.jwtSecret);
    const [rows] = await pool.query(
      "SELECT id, name, email, role, avatar_url, preferred_language, score, weekly_score, is_blocked, created_at FROM users WHERE id = ?",
      [payload.id],
    );
    if (!rows[0]) return res.status(401).json({ message: "Utilisateur introuvable." });
    if (rows[0].is_blocked) return res.status(403).json({ message: "Ce compte est bloqué." });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ message: "Session invalide ou expirée." });
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return next();
    const payload = jwt.verify(token, env.jwtSecret);
    const [rows] = await pool.query(
      "SELECT id, name, email, role, avatar_url, preferred_language, score, weekly_score, is_blocked, created_at FROM users WHERE id = ?",
      [payload.id],
    );
    if (rows[0] && !rows[0].is_blocked) req.user = rows[0];
  } catch {
    // This middleware is used on public routes; invalid tokens stay anonymous.
  }
  next();
}

export function admin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Accès administrateur requis." });
  next();
}
