import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import PDFDocument from "pdfkit";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createHash } from "crypto";
import env from "./config/env.js";
import pool from "./config/db.js";
import { migrateDatabase } from "./config/migrate.js";
import { auth, optionalAuth, admin } from "./middleware/auth.js";
import { searchGutendex, getGutendexBook } from "./utils/gutendex.js";
import { importBook } from "./utils/importBook.js";
import { askMistral } from "./utils/mistral.js";

const app = express();
const backendDir = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(backendDir, "../uploads");
const speechCacheDir = path.resolve(backendDir, "../speech-cache");
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(speechCacheDir, { recursive: true });
const speechJobs = new Map();
let elevenLabsUnavailableUntil = 0;
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase() || ".webm"}`),
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith("audio/") || file.mimetype === "video/webm" || file.mimetype === "application/octet-stream"),
});
app.use(cors({ origin: env.frontendUrl.split(",").map((origin) => origin.trim()) }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use("/speech-audio", express.static(speechCacheDir, { maxAge: "30d", immutable: true }));

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sign = (user) => jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: "7d" });
const publicUser = ({ password, ...user }) => user;
const notify = (userId, type, title, message, link = null) =>
  pool.query("INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)", [userId, type, title, message, link]);
const requireConversationMember = async (conversationId, userId) => {
  const [rows] = await pool.query("SELECT role FROM conversation_members WHERE conversation_id=? AND user_id=?", [conversationId, userId]);
  if (!rows[0]) throw Object.assign(new Error("Vous n’êtes pas membre de cette conversation."), { status: 403 });
  return rows[0];
};

app.get("/api/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", service: "Smart Library AI" });
}));

app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || password?.length < 6) {
    return res.status(400).json({ message: "Nom, email et mot de passe (6 caractères minimum) requis." });
  }
  const [exists] = await pool.query("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if (exists[0]) return res.status(409).json({ message: "Cet email est déjà utilisé." });
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
    name.trim(), email.toLowerCase().trim(), hash,
  ]);
  const user = { id: result.insertId, name: name.trim(), email: email.toLowerCase().trim(), role: "user", avatar_url: null, preferred_language: "fr", score: 0, weekly_score: 0 };
  res.status(201).json({ token: sign(user), user });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [req.body.email?.toLowerCase().trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) {
    return res.status(401).json({ message: "Email ou mot de passe incorrect." });
  }
  if (user.is_blocked) return res.status(403).json({ message: "Ce compte est bloqué." });
  res.json({ token: sign(user), user: publicUser(user) });
}));
app.get("/api/auth/profile", auth, (req, res) => res.json(req.user));
app.put("/api/auth/profile", auth, asyncRoute(async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.toLowerCase().trim();
  if (!name || !email) return res.status(400).json({ message: "Nom et email requis." });
  const [duplicate] = await pool.query("SELECT id FROM users WHERE email=? AND id<>?", [email, req.user.id]);
  if (duplicate[0]) return res.status(409).json({ message: "Cet email est déjà utilisé." });
  const preferredLanguage = ["fr", "en", "ar"].includes(req.body.preferred_language) ? req.body.preferred_language : req.user.preferred_language;
  const fields = ["name=?", "email=?", "preferred_language=?"];
  const params = [name, email, preferredLanguage];
  if (req.body.password) {
    if (req.body.password.length < 6) return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });
    fields.push("password=?");
    params.push(await bcrypt.hash(req.body.password, 12));
  }
  await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id=?`, [...params, req.user.id]);
  const [rows] = await pool.query("SELECT id, name, email, role, avatar_url, preferred_language, score, weekly_score, is_blocked, created_at FROM users WHERE id=?", [req.user.id]);
  res.json({ message: "Profil modifié.", user: rows[0] });
}));

app.post("/api/auth/profile/avatar", auth, upload.single("avatar"), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choisissez une image JPG, PNG ou WebP de moins de 3 Mo." });
  const avatarUrl = `/uploads/${req.file.filename}`;
  await pool.query("UPDATE users SET avatar_url=? WHERE id=?", [avatarUrl, req.user.id]);
  res.json({ message: "Photo de profil mise à jour.", avatar_url: avatarUrl });
}));
app.get("/api/auth/activity", auth, asyncRoute(async (req, res) => {
  const [comments] = await pool.query("SELECT c.id, c.text, c.created_at, b.id book_id, b.title book_title FROM comments c JOIN books b ON b.id=c.book_id WHERE c.user_id=? ORDER BY c.created_at DESC", [req.user.id]);
  const [wishes] = await pool.query("SELECT * FROM wishes WHERE user_id=? ORDER BY created_at DESC", [req.user.id]);
  const [history] = await pool.query("SELECT week_start, week_end, weekly_score, rank_position FROM weekly_rank_history WHERE user_id=? ORDER BY week_start DESC", [req.user.id]);
  const [favorites] = await pool.query(`${bookSelect} JOIN favorites own_favorite ON own_favorite.book_id=b.id WHERE own_favorite.user_id=? GROUP BY b.id ORDER BY own_favorite.id DESC LIMIT 20`, [req.user.id]);
  const [viewers] = await pool.query(
    `SELECT pv.viewer_user_id id, u.name, u.avatar_url, MAX(pv.created_at) last_viewed_at
     FROM profile_views pv LEFT JOIN users u ON u.id=pv.viewer_user_id
     WHERE pv.viewed_user_id=? GROUP BY pv.viewer_user_id, u.name, u.avatar_url ORDER BY last_viewed_at DESC LIMIT 30`,
    [req.user.id],
  );
  res.json({ comments, wishes, history, favorites: favorites.map(shapeBook), viewers });
}));

app.get("/api/notifications", auth, asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const unreadOnly = req.query.unread === "1";
  const filter = unreadOnly ? " AND is_read=0" : "";
  const [count] = await pool.query(`SELECT COUNT(*) total, (SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0) unread FROM notifications WHERE user_id=?${filter}`, [req.user.id, req.user.id]);
  const [rows] = await pool.query(`SELECT * FROM notifications WHERE user_id=?${filter} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [req.user.id, limit, (page - 1) * limit]);
  res.json({ notifications: rows, unread: Number(count[0].unread || 0), pagination: { page, pages: Math.max(1, Math.ceil(count[0].total / limit)) } });
}));
app.put("/api/notifications/:id/read", auth, asyncRoute(async (req, res) => {
  await pool.query("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  res.json({ message: "Notification lue." });
}));
app.put("/api/notifications/read-all", auth, asyncRoute(async (req, res) => {
  await pool.query("UPDATE notifications SET is_read=1 WHERE user_id=?", [req.user.id]);
  res.json({ message: "Notifications lues." });
}));
app.delete("/api/notifications/:id", auth, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM notifications WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  res.json({ message: "Notification supprimée." });
}));

app.post("/api/support", auth, asyncRoute(async (req, res) => {
  const subject = req.body.subject?.trim();
  const message = req.body.message?.trim();
  if (!subject || !message) return res.status(400).json({ message: "Sujet et message requis." });
  const connection = await pool.getConnection();
  let ticketId;
  try {
    await connection.beginTransaction();
    const [result] = await connection.query("INSERT INTO support_tickets (user_id, subject, message) VALUES (?, ?, ?)", [req.user.id, subject, message]);
    ticketId = result.insertId;
    await connection.query("INSERT INTO support_messages (ticket_id,user_id,message) VALUES (?,?,?)", [ticketId, req.user.id, message]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  const [admins] = await pool.query("SELECT id FROM users WHERE role='admin' AND is_blocked=0");
  await Promise.all(admins.map((adminUser) => notify(adminUser.id, "support", "Nouveau message support", `${req.user.name}: ${subject}`, "/admin/moderation")));
  res.status(201).json({ id: ticketId, message: "Conversation support créée." });
}));
app.get("/api/support", auth, asyncRoute(async (req, res) => {
  const [tickets] = await pool.query("SELECT * FROM support_tickets WHERE user_id=? ORDER BY updated_at DESC", [req.user.id]);
  for (const ticket of tickets) {
    const [messages] = await pool.query(
      "SELECT sm.*, u.name user_name, u.role user_role FROM support_messages sm JOIN users u ON u.id=sm.user_id WHERE sm.ticket_id=? ORDER BY sm.created_at",
      [ticket.id],
    );
    ticket.messages = messages.length ? messages : [{ id: `legacy-${ticket.id}`, user_id: ticket.user_id, user_role: "user", message: ticket.message, created_at: ticket.created_at }];
    if (ticket.admin_reply && !messages.some((item) => item.user_role === "admin")) ticket.messages.push({ id: `legacy-reply-${ticket.id}`, user_role: "admin", user_name: "Administration", message: ticket.admin_reply, created_at: ticket.updated_at });
  }
  res.json(tickets);
}));
app.get("/api/admin/support", auth, admin, asyncRoute(async (_req, res) => {
  const [tickets] = await pool.query("SELECT st.*, u.name user_name, u.email user_email FROM support_tickets st JOIN users u ON u.id=st.user_id ORDER BY st.updated_at DESC");
  for (const ticket of tickets) {
    const [messages] = await pool.query("SELECT sm.*, u.name user_name, u.role user_role FROM support_messages sm JOIN users u ON u.id=sm.user_id WHERE sm.ticket_id=? ORDER BY sm.created_at", [ticket.id]);
    ticket.messages = messages.length ? messages : [{ id: `legacy-${ticket.id}`, user_id: ticket.user_id, user_name: ticket.user_name, user_role: "user", message: ticket.message, created_at: ticket.created_at }];
    if (ticket.admin_reply && !ticket.messages.some((item) => item.user_role === "admin")) ticket.messages.push({ id: `legacy-reply-${ticket.id}`, user_role: "admin", user_name: "Administration", message: ticket.admin_reply, created_at: ticket.updated_at });
  }
  res.json(tickets);
}));
app.post("/api/support/:id/messages", auth, asyncRoute(async (req, res) => {
  const message = req.body.message?.trim();
  if (!message) return res.status(400).json({ message: "Message requis." });
  const [tickets] = await pool.query("SELECT user_id, subject, status FROM support_tickets WHERE id=?", [req.params.id]);
  if (!tickets[0]) return res.status(404).json({ message: "Ticket introuvable." });
  if (req.user.role !== "admin" && tickets[0].user_id !== req.user.id) return res.status(403).json({ message: "Accès interdit." });
  if (tickets[0].status === "closed") return res.status(409).json({ message: "Cette conversation support est fermée." });
  await pool.query("INSERT INTO support_messages (ticket_id,user_id,message) VALUES (?,?,?)", [req.params.id, req.user.id, message]);
  await pool.query("UPDATE support_tickets SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [req.user.role === "admin" ? "answered" : "open", req.params.id]);
  if (req.user.role === "admin") await notify(tickets[0].user_id, "support_reply", "Nouveau message du support", message, "/profile?tab=support");
  else {
    const [admins] = await pool.query("SELECT id FROM users WHERE role='admin' AND is_blocked=0");
    await Promise.all(admins.map((adminUser) => notify(adminUser.id, "support", "Nouvelle réponse support", `${req.user.name}: ${tickets[0].subject}`, "/admin/moderation")));
  }
  res.status(201).json({ message: "Message envoyé." });
}));
app.put("/api/admin/support/:id", auth, admin, asyncRoute(async (req, res) => {
  const reply = req.body.reply?.trim();
  if (!reply) return res.status(400).json({ message: "Réponse requise." });
  const [rows] = await pool.query("SELECT user_id, subject FROM support_tickets WHERE id=?", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Ticket introuvable." });
  await pool.query("INSERT INTO support_messages (ticket_id,user_id,message) VALUES (?,?,?)", [req.params.id, req.user.id, reply]);
  await pool.query("UPDATE support_tickets SET admin_reply=?, status='answered' WHERE id=?", [reply, req.params.id]);
  await notify(rows[0].user_id, "support_reply", "Réponse du support", reply, "/profile");
  res.json({ message: "Réponse envoyée." });
}));
app.put("/api/admin/support/:id/status", auth, admin, asyncRoute(async (req, res) => {
  const status = ["open", "answered", "closed"].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ message: "Statut invalide." });
  await pool.query("UPDATE support_tickets SET status=? WHERE id=?", [status, req.params.id]);
  res.json({ message: "Statut du support mis à jour." });
}));
app.delete("/api/admin/support/:id", auth, admin, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM support_tickets WHERE id=?", [req.params.id]);
  res.json({ message: "Historique support supprimé." });
}));

app.post("/api/reports", auth, asyncRoute(async (req, res) => {
  const { target_type, target_id } = req.body;
  const reason = req.body.reason?.trim();
  if (!["user", "comment", "summary"].includes(target_type) || !Number(target_id) || !reason) return res.status(400).json({ message: "Signalement invalide." });
  const [result] = await pool.query("INSERT INTO reports (reporter_user_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)", [req.user.id, target_type, target_id, reason]);
  const [admins] = await pool.query("SELECT id FROM users WHERE role='admin' AND is_blocked=0");
  await Promise.all(admins.map((adminUser) => notify(adminUser.id, "report", "Nouveau signalement", `${target_type} #${target_id}`, "/admin/moderation")));
  res.status(201).json({ id: result.insertId, message: "Signalement envoyé." });
}));
app.get("/api/admin/reports", auth, admin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT r.*, u.name reporter_name FROM reports r JOIN users u ON u.id=r.reporter_user_id ORDER BY r.updated_at DESC");
  const reports = await Promise.all(rows.map(async (report) => {
    const [messages] = await pool.query("SELECT rm.*, u.name user_name, u.role user_role FROM report_messages rm JOIN users u ON u.id=rm.user_id WHERE rm.report_id=? ORDER BY rm.created_at", [report.id]);
    report.messages = messages;
    if (report.target_type === "user") {
      const [targets] = await pool.query(
        "SELECT id, name author_name, email author_email, avatar_url author_avatar, is_blocked FROM users WHERE id=?",
        [report.target_id],
      );
      return { ...report, target: targets[0] || null };
    }
    if (report.target_type === "comment") {
      const [targets] = await pool.query(
        `SELECT c.id, c.text content, c.user_id author_id, c.book_id, c.created_at,
         u.name author_name, u.email author_email, u.avatar_url author_avatar, u.is_blocked,
         b.title book_title
         FROM comments c JOIN users u ON u.id=c.user_id JOIN books b ON b.id=c.book_id
         WHERE c.id=?`,
        [report.target_id],
      );
      return { ...report, target: targets[0] || null };
    }
    const [targets] = await pool.query(
      `SELECT ps.id, ps.text content, ps.user_id author_id, ps.book_id, ps.created_at,
       u.name author_name, u.email author_email, u.avatar_url author_avatar, u.is_blocked,
       b.title book_title
       FROM public_summaries ps JOIN users u ON u.id=ps.user_id JOIN books b ON b.id=ps.book_id
       WHERE ps.id=?`,
      [report.target_id],
    );
    return { ...report, target: targets[0] || null };
  }));
  res.json(reports);
}));
app.post("/api/reports/:id/messages", auth, asyncRoute(async (req, res) => {
  const message = req.body.message?.trim();
  if (!message) return res.status(400).json({ message: "Message requis." });
  const [reports] = await pool.query("SELECT reporter_user_id, status FROM reports WHERE id=?", [req.params.id]);
  if (!reports[0]) return res.status(404).json({ message: "Signalement introuvable." });
  if (req.user.role !== "admin" && reports[0].reporter_user_id !== req.user.id) return res.status(403).json({ message: "Accès interdit." });
  await pool.query("INSERT INTO report_messages (report_id,user_id,message) VALUES (?,?,?)", [req.params.id, req.user.id, message]);
  if (req.user.role === "admin") await notify(reports[0].reporter_user_id, "report_reply", "Nouveau message sur votre signalement", message, "/notifications");
  res.status(201).json({ message: "Message ajouté au signalement." });
}));
app.put("/api/admin/reports/:id", auth, admin, asyncRoute(async (req, res) => {
  const reply = req.body.reply?.trim() || "";
  const status = ["reviewed", "dismissed"].includes(req.body.status) ? req.body.status : "reviewed";
  const [rows] = await pool.query("SELECT reporter_user_id, target_type, target_id FROM reports WHERE id=?", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Signalement introuvable." });
  await pool.query("UPDATE reports SET admin_reply=?, status=? WHERE id=?", [reply, status, req.params.id]);
  await notify(rows[0].reporter_user_id, "report_reply", "Signalement traité", reply || `Votre signalement ${rows[0].target_type} #${rows[0].target_id} a été traité.`, "/profile");
  res.json({ message: "Signalement traité." });
}));
app.post("/api/admin/reports/:id/action", auth, admin, asyncRoute(async (req, res) => {
  const action = req.body.action;
  const reply = req.body.reply?.trim() || "";
  if (!["delete_target", "block_user"].includes(action)) return res.status(400).json({ message: "Action de modération invalide." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [reports] = await connection.query("SELECT * FROM reports WHERE id=? FOR UPDATE", [req.params.id]);
    const report = reports[0];
    if (!report) throw Object.assign(new Error("Signalement introuvable."), { status: 404 });

    let targetUserId = null;
    let actionMessage = "";
    if (report.target_type === "user") {
      targetUserId = report.target_id;
    } else if (report.target_type === "comment") {
      const [targets] = await connection.query("SELECT user_id FROM comments WHERE id=?", [report.target_id]);
      targetUserId = targets[0]?.user_id || null;
    } else {
      const [targets] = await connection.query("SELECT user_id FROM public_summaries WHERE id=?", [report.target_id]);
      targetUserId = targets[0]?.user_id || null;
    }

    if (action === "delete_target") {
      if (report.target_type === "comment") {
        const [result] = await connection.query("DELETE FROM comments WHERE id=?", [report.target_id]);
        if (!result.affectedRows) throw Object.assign(new Error("Ce commentaire a déjà été supprimé."), { status: 404 });
        actionMessage = "Commentaire supprimé.";
      } else if (report.target_type === "summary") {
        const [result] = await connection.query("DELETE FROM public_summaries WHERE id=?", [report.target_id]);
        if (!result.affectedRows) throw Object.assign(new Error("Ce résumé a déjà été supprimé."), { status: 404 });
        actionMessage = "Résumé supprimé.";
      } else {
        throw Object.assign(new Error("Un utilisateur doit être bloqué, pas supprimé depuis un signalement."), { status: 400 });
      }
    } else {
      if (!targetUserId) throw Object.assign(new Error("L’auteur du contenu est introuvable."), { status: 404 });
      if (targetUserId === req.user.id) throw Object.assign(new Error("Vous ne pouvez pas bloquer votre propre compte."), { status: 400 });
      await connection.query("UPDATE users SET is_blocked=1 WHERE id=?", [targetUserId]);
      actionMessage = "Utilisateur bloqué.";
    }

    const adminReply = reply || actionMessage;
    await connection.query("UPDATE reports SET admin_reply=?, status='reviewed' WHERE id=?", [adminReply, report.id]);
    await connection.commit();
    await notify(report.reporter_user_id, "report_reply", "Signalement traité", adminReply, "/profile");
    if (targetUserId) await notify(targetUserId, "moderation", "Action de modération", actionMessage, "/profile");
    res.json({ message: `${actionMessage} Signalement classé comme examiné.` });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.get("/api/users", auth, asyncRoute(async (req, res) => {
  const search = req.query.search?.trim() || "";
  const like = `%${search}%`;
  const [rows] = await pool.query(
    `SELECT id, name, email, avatar_url, role
     FROM users
     WHERE id<>? AND is_blocked=0 AND (name LIKE ? OR email LIKE ?)
     AND NOT EXISTS (
       SELECT 1 FROM user_blocks ub
       WHERE (ub.blocker_user_id=? AND ub.blocked_user_id=users.id)
          OR (ub.blocker_user_id=users.id AND ub.blocked_user_id=?)
     )
     ORDER BY name LIMIT 50`,
    [req.user.id, like, like, req.user.id, req.user.id],
  );
  res.json(rows);
}));
app.get("/api/users/blocks", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar_url, ub.created_at blocked_at
     FROM user_blocks ub JOIN users u ON u.id=ub.blocked_user_id
     WHERE ub.blocker_user_id=? ORDER BY ub.created_at DESC`,
    [req.user.id],
  );
  res.json(rows);
}));
app.get("/api/users/:id", optionalAuth, asyncRoute(async (req, res) => {
  const userId = Number(req.params.id);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 6));
  const [users] = await pool.query("SELECT id, name, avatar_url, score, weekly_score, created_at FROM users WHERE id=? AND is_blocked=0", [userId]);
  if (!users[0]) return res.status(404).json({ message: "Profil introuvable." });

  if (req.user?.id !== userId) {
    const visitorKey = createHash("sha256").update(`${req.ip}|${req.headers["user-agent"] || ""}|${env.jwtSecret}`).digest("hex");
    const [recent] = await pool.query(
      `SELECT id FROM profile_views WHERE viewed_user_id=? AND
       ((viewer_user_id IS NOT NULL AND viewer_user_id=?) OR (viewer_user_id IS NULL AND visitor_key=?))
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) LIMIT 1`,
      [userId, req.user?.id || 0, visitorKey],
    );
    if (!recent[0]) await pool.query("INSERT INTO profile_views (viewed_user_id, viewer_user_id, visitor_key) VALUES (?, ?, ?)", [userId, req.user?.id || null, visitorKey]);
  }

  const [counts] = await pool.query(
    `SELECT
     (SELECT COUNT(*) FROM user_likes WHERE liked_user_id=?) like_count,
     (SELECT COUNT(*) FROM profile_views WHERE viewed_user_id=?) view_count,
     (SELECT COUNT(*) FROM favorites WHERE user_id=?) favorite_count,
     (SELECT COUNT(*) FROM comments WHERE user_id=?) comment_count,
     (SELECT COUNT(*) FROM wishes WHERE user_id=?) wish_count`,
    [userId, userId, userId, userId, userId],
  );
  const [liked] = req.user ? await pool.query("SELECT id FROM user_likes WHERE liker_user_id=? AND liked_user_id=?", [req.user.id, userId]) : [[]];
  const [ranking] = await pool.query("SELECT id FROM users WHERE is_blocked=0 ORDER BY weekly_score DESC, score DESC");
  const rankPosition = ranking.findIndex((row) => row.id === userId) + 1;
  const [favorites] = await pool.query(`${bookSelect} JOIN favorites own_favorite ON own_favorite.book_id=b.id WHERE own_favorite.user_id=? GROUP BY b.id ORDER BY own_favorite.id DESC LIMIT ? OFFSET ?`, [userId, limit, (page - 1) * limit]);
  const [comments] = await pool.query("SELECT c.id, c.text, c.created_at, b.id book_id, b.title book_title FROM comments c JOIN books b ON b.id=c.book_id WHERE c.user_id=? ORDER BY c.created_at DESC LIMIT ? OFFSET ?", [userId, limit, (page - 1) * limit]);
  const [wishes] = await pool.query("SELECT id, book_title, author, message, status, created_at FROM wishes WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?", [userId, limit, (page - 1) * limit]);
  const [history] = await pool.query("SELECT week_start, week_end, weekly_score, rank_position FROM weekly_rank_history WHERE user_id=? ORDER BY week_start DESC LIMIT ? OFFSET ?", [userId, limit, (page - 1) * limit]);
  res.json({
    user: users[0], ...counts[0], is_liked: Boolean(liked[0]), rank_position: rankPosition || null,
    favorites: favorites.map(shapeBook), comments, wishes, history,
    pagination: { page, limit, pages: Math.max(1, Math.ceil(Math.max(counts[0].favorite_count, counts[0].comment_count, counts[0].wish_count) / limit)) },
  });
}));
app.post("/api/users/:id/like", auth, asyncRoute(async (req, res) => {
  const likedUserId = Number(req.params.id);
  if (likedUserId === req.user.id) return res.status(400).json({ message: "Vous ne pouvez pas aimer votre propre profil." });
  await pool.query("INSERT IGNORE INTO user_likes (liker_user_id, liked_user_id) VALUES (?, ?)", [req.user.id, likedUserId]);
  const [count] = await pool.query("SELECT COUNT(*) count FROM user_likes WHERE liked_user_id=?", [likedUserId]);
  res.json({ liked: true, count: count[0].count });
}));
app.delete("/api/users/:id/like", auth, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM user_likes WHERE liker_user_id=? AND liked_user_id=?", [req.user.id, req.params.id]);
  const [count] = await pool.query("SELECT COUNT(*) count FROM user_likes WHERE liked_user_id=?", [req.params.id]);
  res.json({ liked: false, count: count[0].count });
}));

app.get("/api/conversations", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.*,
     COALESCE(c.name, GROUP_CONCAT(CASE WHEN u.id<>? THEN u.name END SEPARATOR ', '), b.title) display_name,
     COALESCE(c.image_url, MAX(CASE WHEN u.id<>? THEN u.avatar_url END), b.cover_image) display_image,
     (SELECT COALESCE(m.text, IF(m.audio_url IS NOT NULL, '🎤 Audio', '')) FROM messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC LIMIT 1) last_message,
     (SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id=c.id) last_message_at
     FROM conversations c
     LEFT JOIN conversation_members cm ON cm.conversation_id=c.id
     LEFT JOIN conversation_members all_cm ON all_cm.conversation_id=c.id
     LEFT JOIN users u ON u.id=all_cm.user_id
     LEFT JOIN books b ON b.id=c.book_id
     WHERE (cm.user_id=? OR (c.type='book' AND NOT EXISTS (
       SELECT 1 FROM conversation_bans cb WHERE cb.conversation_id=c.id AND cb.user_id=?
     )))
     GROUP BY c.id ORDER BY COALESCE(last_message_at,c.created_at) DESC`,
    [req.user.id, req.user.id, req.user.id, req.user.id],
  );
  res.json(rows);
}));
app.post("/api/conversations/private/:userId", auth, asyncRoute(async (req, res) => {
  const otherId = Number(req.params.userId);
  if (otherId === req.user.id) return res.status(400).json({ message: "Conversation invalide." });
  const [blocked] = await pool.query(
    "SELECT id FROM user_blocks WHERE (blocker_user_id=? AND blocked_user_id=?) OR (blocker_user_id=? AND blocked_user_id=?) LIMIT 1",
    [req.user.id, otherId, otherId, req.user.id],
  );
  if (blocked[0]) return res.status(403).json({ message: "Cette conversation est bloquée." });
  const [existing] = await pool.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=?
     JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=?
     WHERE c.type='private' LIMIT 1`,
    [req.user.id, otherId],
  );
  if (existing[0]) return res.json({ id: existing[0].id });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [created] = await connection.query("INSERT INTO conversations (type, created_by) VALUES ('private', ?)", [req.user.id]);
    await connection.query("INSERT INTO conversation_members (conversation_id,user_id,role) VALUES (?,?,'member'),(?,?,'member')", [created.insertId, req.user.id, created.insertId, otherId]);
    await connection.commit();
    res.status(201).json({ id: created.insertId });
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}));
app.post("/api/users/:id/block", auth, asyncRoute(async (req, res) => {
  const blockedId = Number(req.params.id);
  if (!blockedId || blockedId === req.user.id) return res.status(400).json({ message: "Utilisateur invalide." });
  await pool.query("INSERT IGNORE INTO user_blocks (blocker_user_id,blocked_user_id) VALUES (?,?)", [req.user.id, blockedId]);
  res.json({ message: "Utilisateur bloqué." });
}));
app.delete("/api/users/:id/block", auth, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM user_blocks WHERE blocker_user_id=? AND blocked_user_id=?", [req.user.id, req.params.id]);
  res.json({ message: "Utilisateur débloqué." });
}));
app.post("/api/conversations/group", auth, upload.single("image"), asyncRoute(async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ message: "Nom du groupe requis." });
  const type = req.body.book_id && req.user.role === "admin" ? "book" : "group";
  if (type === "book") {
    const [existing] = await pool.query("SELECT id FROM conversations WHERE type='book' AND book_id=? LIMIT 1", [req.body.book_id]);
    if (existing[0]) return res.json({ id: existing[0].id, existing: true });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const [created] = await pool.query("INSERT INTO conversations (type,name,image_url,book_id,created_by) VALUES (?,?,?,?,?)", [type, name, imageUrl, req.body.book_id || null, req.user.id]);
  await pool.query("INSERT INTO conversation_members (conversation_id,user_id,role) VALUES (?,?,'admin')", [created.insertId, req.user.id]);
  const memberIds = [...new Set(String(req.body.member_ids || "").split(",").map(Number).filter((id) => id && id !== req.user.id))];
  for (const memberId of memberIds) {
    await pool.query("INSERT IGNORE INTO conversation_members (conversation_id,user_id) VALUES (?,?)", [created.insertId, memberId]);
    await notify(memberId, "conversation", "Ajouté à un groupe", `Vous avez été ajouté au groupe « ${name} ».`, `/messages?conversation=${created.insertId}`);
  }
  res.status(201).json({ id: created.insertId });
}));
app.post("/api/admin/conversations/group", auth, admin, upload.single("image"), asyncRoute(async (req, res) => {
  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ message: "Nom du groupe requis." });
  const type = req.body.book_id ? "book" : "group";
  if (type === "book") {
    const [existing] = await pool.query("SELECT id FROM conversations WHERE type='book' AND book_id=? LIMIT 1", [req.body.book_id]);
    if (existing[0]) return res.json({ id: existing[0].id, existing: true });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const [created] = await pool.query("INSERT INTO conversations (type,name,image_url,book_id,created_by) VALUES (?,?,?,?,?)", [type, name, imageUrl, req.body.book_id || null, req.user.id]);
  await pool.query("INSERT INTO conversation_members (conversation_id,user_id,role) VALUES (?,?,'admin')", [created.insertId, req.user.id]);
  res.status(201).json({ id: created.insertId });
}));
const requireConversationManager = async (conversationId, user) => {
  const [rows] = await pool.query(
    `SELECT c.type,c.created_by,cm.role FROM conversations c
     LEFT JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.user_id=? WHERE c.id=?`,
    [user.id, conversationId],
  );
  if (!rows[0] || (user.role !== "admin" && rows[0].created_by !== user.id && rows[0].role !== "admin")) throw Object.assign(new Error("Gestion du groupe interdite."), { status: 403 });
  return rows[0];
};
app.get("/api/conversations/:id/members", auth, asyncRoute(async (req, res) => {
  await requireConversationMember(req.params.id, req.user.id);
  const [rows] = await pool.query("SELECT cm.user_id id,cm.role,cm.joined_at,u.name,u.avatar_url FROM conversation_members cm JOIN users u ON u.id=cm.user_id WHERE cm.conversation_id=? ORDER BY cm.role='admin' DESC,u.name", [req.params.id]);
  res.json(rows);
}));
app.post("/api/conversations/:id/members/:userId", auth, asyncRoute(async (req, res) => {
  await requireConversationManager(req.params.id, req.user);
  const [banned] = await pool.query("SELECT id FROM conversation_bans WHERE conversation_id=? AND user_id=?", [req.params.id, req.params.userId]);
  if (banned[0]) return res.status(409).json({ message: "Cet utilisateur est banni du groupe." });
  await pool.query("INSERT IGNORE INTO conversation_members (conversation_id,user_id) VALUES (?,?)", [req.params.id, req.params.userId]);
  const [conversation] = await pool.query("SELECT name FROM conversations WHERE id=?", [req.params.id]);
  await notify(req.params.userId, "conversation", "Ajouté à un groupe", `Vous avez été ajouté au groupe « ${conversation[0]?.name || "Groupe"} ».`, `/messages?conversation=${req.params.id}`);
  res.json({ message: "Membre ajouté." });
}));
app.delete("/api/conversations/:id/members/:userId", auth, asyncRoute(async (req, res) => {
  await requireConversationManager(req.params.id, req.user);
  await pool.query("DELETE FROM conversation_members WHERE conversation_id=? AND user_id=?", [req.params.id, req.params.userId]);
  res.json({ message: "Membre retiré." });
}));
app.post("/api/conversations/:id/ban/:userId", auth, asyncRoute(async (req, res) => {
  await requireConversationManager(req.params.id, req.user);
  await pool.query("DELETE FROM conversation_members WHERE conversation_id=? AND user_id=?", [req.params.id, req.params.userId]);
  await pool.query("INSERT INTO conversation_bans (conversation_id,user_id,banned_by) VALUES (?,?,?) ON DUPLICATE KEY UPDATE banned_by=VALUES(banned_by)", [req.params.id, req.params.userId, req.user.id]);
  res.json({ message: "Membre banni du groupe." });
}));
app.put("/api/conversations/:id", auth, upload.single("image"), asyncRoute(async (req, res) => {
  await requireConversationManager(req.params.id, req.user);
  const fields = [], params = [];
  if (req.body.name?.trim()) { fields.push("name=?"); params.push(req.body.name.trim()); }
  if (req.file) { fields.push("image_url=?"); params.push(`/uploads/${req.file.filename}`); }
  if (!fields.length) return res.status(400).json({ message: "Aucune modification." });
  await pool.query(`UPDATE conversations SET ${fields.join(",")} WHERE id=? AND type IN ('group','book')`, [...params, req.params.id]);
  res.json({ message: "Groupe modifié." });
}));
app.delete("/api/conversations/:id", auth, asyncRoute(async (req, res) => {
  await requireConversationManager(req.params.id, req.user);
  await pool.query("DELETE FROM conversations WHERE id=? AND type IN ('group','book')", [req.params.id]);
  res.json({ message: "Groupe supprimé." });
}));
app.post("/api/conversations/:id/join", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT type FROM conversations WHERE id=?", [req.params.id]);
  if (!rows[0] || rows[0].type !== "book") return res.status(400).json({ message: "Salon public invalide." });
  const [banned] = await pool.query("SELECT id FROM conversation_bans WHERE conversation_id=? AND user_id=?", [req.params.id, req.user.id]);
  if (banned[0]) return res.status(403).json({ message: "Vous avez été banni de ce salon." });
  await pool.query("INSERT IGNORE INTO conversation_members (conversation_id,user_id) VALUES (?,?)", [req.params.id, req.user.id]);
  res.json({ message: "Salon rejoint." });
}));
app.get("/api/conversations/:id/messages", auth, asyncRoute(async (req, res) => {
  const [conversation] = await pool.query("SELECT type FROM conversations WHERE id=?", [req.params.id]);
  if (!conversation[0]) return res.status(404).json({ message: "Conversation introuvable." });
  if (conversation[0].type !== "book") await requireConversationMember(req.params.id, req.user.id);
  const before = Number(req.query.before) || Number.MAX_SAFE_INTEGER;
  const [rows] = await pool.query(
    `SELECT m.*, u.name user_name, u.avatar_url user_avatar FROM messages m
     JOIN users u ON u.id=m.user_id WHERE m.conversation_id=? AND m.id<? ORDER BY m.id DESC LIMIT 50`,
    [req.params.id, before],
  );
  res.json(rows.reverse());
}));
app.post("/api/conversations/:id/messages", auth, audioUpload.single("audio"), asyncRoute(async (req, res) => {
  const [conversation] = await pool.query("SELECT type,name FROM conversations WHERE id=?", [req.params.id]);
  if (!conversation[0]) return res.status(404).json({ message: "Conversation introuvable." });
  await requireConversationMember(req.params.id, req.user.id);
  if (conversation[0].type === "private") {
    const [blocked] = await pool.query(
      `SELECT ub.id FROM user_blocks ub JOIN conversation_members cm ON cm.conversation_id=? AND cm.user_id<>?
       WHERE (ub.blocker_user_id=? AND ub.blocked_user_id=cm.user_id) OR (ub.blocker_user_id=cm.user_id AND ub.blocked_user_id=?) LIMIT 1`,
      [req.params.id, req.user.id, req.user.id, req.user.id],
    );
    if (blocked[0]) return res.status(403).json({ message: "Vous ne pouvez plus envoyer de message dans cette conversation." });
  }
  const text = req.body.text?.trim() || null;
  const audioUrl = req.file ? `/uploads/${req.file.filename}` : null;
  if (!text && !audioUrl) return res.status(400).json({ message: "Message vide." });
  const [created] = await pool.query("INSERT INTO messages (conversation_id,user_id,text,audio_url) VALUES (?,?,?,?)", [req.params.id, req.user.id, text, audioUrl]);
  const [members] = await pool.query("SELECT user_id FROM conversation_members WHERE conversation_id=? AND user_id<>?", [req.params.id, req.user.id]);
  await Promise.all(members.map((member) => notify(member.user_id, "message", `Nouveau message de ${req.user.name}`, text || "🎤 Message audio", `/messages?conversation=${req.params.id}`)));
  res.status(201).json({ id: created.insertId });
}));
app.put("/api/messages/:id", auth, asyncRoute(async (req, res) => {
  const [message] = await pool.query("SELECT audio_url FROM messages WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  if (!message[0]) return res.status(403).json({ message: "Modification interdite." });
  if (message[0].audio_url) return res.status(400).json({ message: "Un message audio ne peut pas être modifié. Vous pouvez uniquement le supprimer." });
  const text = req.body.text?.trim();
  if (!text) return res.status(400).json({ message: "Message vide." });
  const [result] = await pool.query("UPDATE messages SET text=?, is_edited=1 WHERE id=? AND user_id=?", [text, req.params.id, req.user.id]);
  if (!result.affectedRows) return res.status(403).json({ message: "Modification interdite." });
  res.json({ message: "Message modifié." });
}));
app.delete("/api/messages/:id", auth, asyncRoute(async (req, res) => {
  const [result] = await pool.query("DELETE FROM messages WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  if (!result.affectedRows && req.user.role === "admin") await pool.query("DELETE FROM messages WHERE id=?", [req.params.id]);
  res.json({ message: "Message supprimé." });
}));

const bookSelect = `
  SELECT b.*, COALESCE(GROUP_CONCAT(DISTINCT a.gutendex_author_name SEPARATOR '|||'), '') authors,
  COALESCE(GROUP_CONCAT(DISTINCT c.name SEPARATOR '|||'), '') categories,
  COALESCE(AVG(r.value), 0) average_rating, COUNT(DISTINCT r.id) rating_count,
  COUNT(DISTINCT bf.id) favorite_count
  FROM books b
  LEFT JOIN book_authors ba ON ba.book_id=b.id LEFT JOIN authors a ON a.id=ba.author_id
  LEFT JOIN book_categories bc ON bc.book_id=b.id LEFT JOIN categories c ON c.id=bc.category_id
  LEFT JOIN ratings r ON r.book_id=b.id
  LEFT JOIN favorites bf ON bf.book_id=b.id`;
const shapeBook = (b) => ({
  ...b,
  authors: b.authors ? b.authors.split("|||") : [],
  categories: b.categories ? b.categories.split("|||") : [],
  average_rating: Number(b.average_rating || 0),
});

app.get("/api/books", asyncRoute(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
  const where = [], params = [];
  if (req.query.search) {
    where.push("(b.title LIKE ? OR a.gutendex_author_name LIKE ?)");
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }
  if (req.query.category) { where.push("c.id = ?"); params.push(req.query.category); }
  if (req.query.language) { where.push("b.language = ?"); params.push(req.query.language); }
  const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT b.id) total FROM books b
     LEFT JOIN book_authors ba ON ba.book_id=b.id LEFT JOIN authors a ON a.id=ba.author_id
     LEFT JOIN book_categories bc ON bc.book_id=b.id LEFT JOIN categories c ON c.id=bc.category_id${clause}`, params,
  );
  const [rows] = await pool.query(
    `${bookSelect}${clause} GROUP BY b.id ORDER BY b.download_count DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit],
  );
  res.json({ books: rows.map(shapeBook), pagination: { page, limit, total: countRows[0].total, pages: Math.ceil(countRows[0].total / limit) } });
}));

app.get("/api/books/:id", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`${bookSelect} WHERE b.id=? GROUP BY b.id`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Livre introuvable." });
  res.json(shapeBook(rows[0]));
}));

app.get("/api/books/:id/download/pdf", asyncRoute(async (req, res) => {
  const book = await getBookContext(req.params.id);
  let content = book.description || "Texte indisponible.";
  if (book.text_url) {
    try {
      const response = await axios.get(book.text_url, { responseType: "text", timeout: 30000, maxContentLength: 15_000_000 });
      content = String(response.data);
    } catch {
      content = `${book.description || ""}\n\nLe texte intégral n’a pas pu être récupéré. Vous pouvez le lire à cette adresse : ${book.html_url || book.text_url}`;
    }
  }
  const safeName = book.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 80) || "livre";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
  const document = new PDFDocument({ size: "A4", margins: { top: 55, bottom: 55, left: 55, right: 55 }, info: { Title: book.title, Author: book.authors.join(", ") } });
  document.pipe(res);
  document.fontSize(22).text(book.title, { align: "center" });
  document.moveDown(0.5).fontSize(11).fillColor("#555555").text(book.authors.join(", ") || "Auteur inconnu", { align: "center" });
  document.moveDown(2).fillColor("#111111").fontSize(10);
  for (let offset = 0; offset < content.length; offset += 12000) {
    document.text(content.slice(offset, offset + 12000), { align: "justify", lineGap: 2 });
  }
  document.end();
}));

app.post("/api/books", auth, admin, asyncRoute(async (req, res) => {
  const b = req.body;
  if (!b.title?.trim()) return res.status(400).json({ message: "Titre requis." });
  const [result] = await pool.query(
    `INSERT INTO books (title, description, language, cover_image, html_url, epub_url, text_url, download_count, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.title, b.description || null, b.language || "fr", b.cover_image || null, b.html_url || null, b.epub_url || null, b.text_url || null, b.download_count || 0, b.source || "Administration"],
  );
  res.status(201).json({ id: result.insertId, message: "Livre créé." });
}));

app.put("/api/books/:id", auth, admin, asyncRoute(async (req, res) => {
  const allowed = ["title", "description", "language", "cover_image", "html_url", "epub_url", "text_url", "download_count", "source"];
  const fields = allowed.filter((key) => req.body[key] !== undefined);
  if (!fields.length) return res.status(400).json({ message: "Aucune modification." });
  await pool.query(`UPDATE books SET ${fields.map((key) => `${key}=?`).join(", ")} WHERE id=?`, [...fields.map((key) => req.body[key]), req.params.id]);
  res.json({ message: "Livre modifié." });
}));
app.delete("/api/books/:id", auth, admin, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM books WHERE id=?", [req.params.id]);
  res.json({ message: "Livre supprimé." });
}));

app.get("/api/categories", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT c.*, COUNT(bc.book_id) book_count FROM categories c LEFT JOIN book_categories bc ON bc.category_id=c.id GROUP BY c.id ORDER BY c.name");
  res.json(rows);
}));
app.post("/api/categories", auth, admin, asyncRoute(async (req, res) => {
  const [result] = await pool.query("INSERT INTO categories (name) VALUES (?)", [req.body.name]);
  res.status(201).json({ id: result.insertId });
}));
app.put("/api/categories/:id", auth, admin, asyncRoute(async (req, res) => {
  await pool.query("UPDATE categories SET name=? WHERE id=?", [req.body.name, req.params.id]);
  res.json({ message: "Catégorie modifiée." });
}));
app.delete("/api/categories/:id", auth, admin, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM categories WHERE id=?", [req.params.id]);
  res.json({ message: "Catégorie supprimée." });
}));

app.get("/api/gutendex/search", asyncRoute(async (req, res) => res.json(await searchGutendex(req.query))));
app.get("/api/gutendex/book/:id", asyncRoute(async (req, res) => res.json(await getGutendexBook(req.params.id))));
app.post("/api/admin/gutendex/import/:id", auth, admin, asyncRoute(async (req, res) => {
  const result = await importBook(await getGutendexBook(req.params.id));
  res.status(result.added ? 201 : 200).json({ ...result, message: result.added ? "Livre ajouté à la base." : "Ce livre existe déjà." });
}));
app.post("/api/admin/gutendex/import-search", auth, admin, asyncRoute(async (req, res) => {
  const data = await searchGutendex({ search: req.body.search, language: req.body.language, topic: req.body.topic, page: req.body.page });
  let added = 0;
  for (const book of data.results.slice(0, Math.min(Number(req.body.limit) || 10, 20))) {
    const result = await importBook(book);
    if (result.added) added++;
  }
  res.json({ added, processed: Math.min(data.results.length, Number(req.body.limit) || 10) });
}));

app.get("/api/favorites", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`${bookSelect} JOIN favorites f ON f.book_id=b.id WHERE f.user_id=? GROUP BY b.id ORDER BY f.id DESC`, [req.user.id]);
  res.json(rows.map(shapeBook));
}));
app.get("/api/favorites/:bookId", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT id FROM favorites WHERE user_id=? AND book_id=?", [req.user.id, req.params.bookId]);
  res.json({ is_favorite: Boolean(rows[0]) });
}));
app.post("/api/favorites/:bookId", auth, asyncRoute(async (req, res) => {
  await pool.query("INSERT IGNORE INTO favorites (user_id, book_id) VALUES (?, ?)", [req.user.id, req.params.bookId]);
  res.status(201).json({ message: "Ajouté aux favoris." });
}));
app.delete("/api/favorites/:bookId", auth, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM favorites WHERE user_id=? AND book_id=?", [req.user.id, req.params.bookId]);
  res.json({ message: "Retiré des favoris." });
}));

app.get("/api/books/:bookId/comments", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT c.*, u.name user_name, u.avatar_url user_avatar FROM comments c JOIN users u ON u.id=c.user_id WHERE c.book_id=? ORDER BY c.created_at DESC",
    [req.params.bookId],
  );
  res.json(rows);
}));
app.post("/api/books/:bookId/comments", auth, asyncRoute(async (req, res) => {
  if (!req.body.text?.trim()) return res.status(400).json({ message: "Commentaire vide." });
  const [result] = await pool.query("INSERT INTO comments (user_id, book_id, text) VALUES (?, ?, ?)", [req.user.id, req.params.bookId, req.body.text.trim()]);
  res.status(201).json({ id: result.insertId, message: "Commentaire publié." });
}));
app.delete("/api/comments/:id", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT user_id FROM comments WHERE id=?", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Commentaire introuvable." });
  if (rows[0].user_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Action interdite." });
  await pool.query("DELETE FROM comments WHERE id=?", [req.params.id]);
  res.json({ message: "Commentaire supprimé." });
}));

app.post("/api/comments/:id/translate", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT text FROM comments WHERE id=?", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Commentaire introuvable." });
  const targetLanguage = ({ fr: "français", en: "anglais", ar: "arabe" })[req.user.preferred_language] || "français";
  const translated = await askMistral(
    [{ role: "system", content: `Réponds uniquement en JSON: {"translation":"..."}. Traduis fidèlement en ${targetLanguage}.` },
     { role: "user", content: rows[0].text }],
    () => ({ translation: rows[0].text, generated_by_ai: false }),
  );
  res.json(translated);
}));
app.post("/api/comments/translate-batch", auth, asyncRoute(async (req, res) => {
  const ids = [...new Set((req.body.ids || []).map(Number).filter(Boolean))].slice(0, 30);
  if (!ids.length) return res.json({ translations: [] });
  const [rows] = await pool.query(`SELECT id, text FROM comments WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
  const targetLanguage = ({ fr: "français", en: "anglais", ar: "arabe" })[req.user.preferred_language] || "français";
  const translated = await askMistral(
    [{ role: "system", content: `Réponds uniquement en JSON: {"translations":[{"id":1,"text":"..."}]}. Traduis chaque commentaire en ${targetLanguage}, sans changer les identifiants.` },
     { role: "user", content: JSON.stringify(rows) }],
    () => ({ translations: rows.map((row) => ({ id: row.id, text: row.text })), generated_by_ai: false }),
  );
  res.json(translated);
}));

app.get("/api/books/:bookId/community-summaries", optionalAuth, asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
  const [count] = await pool.query("SELECT COUNT(*) total FROM public_summaries WHERE book_id=?", [req.params.bookId]);
  const [rows] = await pool.query(
    `SELECT ps.*, u.name user_name, u.avatar_url user_avatar,
     (SELECT COUNT(*) FROM public_summary_likes psl WHERE psl.summary_id=ps.id) like_count,
     (SELECT COUNT(*) FROM public_summary_comments psc WHERE psc.summary_id=ps.id) comment_count,
     EXISTS(SELECT 1 FROM public_summary_likes mine WHERE mine.summary_id=ps.id AND mine.user_id=?) is_liked
     FROM public_summaries ps JOIN users u ON u.id=ps.user_id
     WHERE ps.book_id=?
     ORDER BY like_count DESC, ps.view_count DESC, comment_count DESC, ps.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user?.id || 0, req.params.bookId, limit, (page - 1) * limit],
  );
  if (rows.length) await pool.query(`UPDATE public_summaries SET view_count=view_count+1 WHERE id IN (${rows.map(() => "?").join(",")})`, rows.map((row) => row.id));
  rows.forEach((row) => { row.view_count += 1; });
  res.json({ summaries: rows, pagination: { page, limit, total: count[0].total, pages: Math.max(1, Math.ceil(count[0].total / limit)) } });
}));
app.post("/api/books/:bookId/community-summaries", auth, asyncRoute(async (req, res) => {
  const text = req.body.text?.trim();
  if (!text || text.length < 50) return res.status(400).json({ message: "Le résumé doit contenir au moins 50 caractères." });
  const [result] = await pool.query("INSERT INTO public_summaries (user_id, book_id, text, language) VALUES (?, ?, ?, ?)", [req.user.id, req.params.bookId, text, req.user.preferred_language]);
  res.status(201).json({ id: result.insertId, message: "Résumé publié." });
}));
app.get("/api/community-summaries/:id", optionalAuth, asyncRoute(async (req, res) => {
  await pool.query("UPDATE public_summaries SET view_count=view_count+1 WHERE id=?", [req.params.id]);
  const [rows] = await pool.query(
    `SELECT ps.*, u.name user_name, u.avatar_url user_avatar,
     (SELECT COUNT(*) FROM public_summary_likes WHERE summary_id=ps.id) like_count,
     EXISTS(SELECT 1 FROM public_summary_likes WHERE summary_id=ps.id AND user_id=?) is_liked
     FROM public_summaries ps JOIN users u ON u.id=ps.user_id WHERE ps.id=?`,
    [req.user?.id || 0, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ message: "Résumé introuvable." });
  res.json(rows[0]);
}));
app.put("/api/community-summaries/:id", auth, asyncRoute(async (req, res) => {
  const text = req.body.text?.trim();
  if (!text || text.length < 50) return res.status(400).json({ message: "Le résumé doit contenir au moins 50 caractères." });
  const [result] = await pool.query("UPDATE public_summaries SET text=?, language=? WHERE id=? AND user_id=?", [text, req.user.preferred_language, req.params.id, req.user.id]);
  if (!result.affectedRows) return res.status(403).json({ message: "Modification interdite." });
  res.json({ message: "Résumé modifié." });
}));
app.delete("/api/community-summaries/:id", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT user_id FROM public_summaries WHERE id=?", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Résumé introuvable." });
  if (rows[0].user_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Suppression interdite." });
  await pool.query("DELETE FROM public_summaries WHERE id=?", [req.params.id]);
  res.json({ message: "Résumé supprimé." });
}));
app.post("/api/community-summaries/:id/like", auth, asyncRoute(async (req, res) => {
  await pool.query("INSERT IGNORE INTO public_summary_likes (summary_id, user_id) VALUES (?, ?)", [req.params.id, req.user.id]);
  const [rows] = await pool.query("SELECT COUNT(*) count FROM public_summary_likes WHERE summary_id=?", [req.params.id]);
  res.json({ liked: true, count: rows[0].count });
}));
app.delete("/api/community-summaries/:id/like", auth, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM public_summary_likes WHERE summary_id=? AND user_id=?", [req.params.id, req.user.id]);
  const [rows] = await pool.query("SELECT COUNT(*) count FROM public_summary_likes WHERE summary_id=?", [req.params.id]);
  res.json({ liked: false, count: rows[0].count });
}));
app.get("/api/community-summaries/:id/comments", asyncRoute(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
  const [count] = await pool.query("SELECT COUNT(*) total FROM public_summary_comments WHERE summary_id=?", [req.params.id]);
  const [rows] = await pool.query(
    `SELECT psc.*, u.name user_name, u.avatar_url user_avatar FROM public_summary_comments psc
     JOIN users u ON u.id=psc.user_id WHERE psc.summary_id=? ORDER BY psc.created_at DESC LIMIT ? OFFSET ?`,
    [req.params.id, limit, (page - 1) * limit],
  );
  res.json({ comments: rows, pagination: { page, pages: Math.max(1, Math.ceil(count[0].total / limit)), total: count[0].total } });
}));
app.post("/api/community-summaries/:id/comments", auth, asyncRoute(async (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return res.status(400).json({ message: "Commentaire vide." });
  const [result] = await pool.query("INSERT INTO public_summary_comments (summary_id, user_id, text) VALUES (?, ?, ?)", [req.params.id, req.user.id, text]);
  res.status(201).json({ id: result.insertId });
}));
app.delete("/api/community-summary-comments/:id", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT user_id FROM public_summary_comments WHERE id=?", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Commentaire introuvable." });
  if (rows[0].user_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Suppression interdite." });
  await pool.query("DELETE FROM public_summary_comments WHERE id=?", [req.params.id]);
  res.json({ message: "Commentaire supprimé." });
}));
app.post("/api/community-summaries/:id/translate", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT text FROM public_summaries WHERE id=?", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Résumé introuvable." });
  const targetLanguage = ({ fr: "français", en: "anglais", ar: "arabe" })[req.user.preferred_language] || "français";
  const translated = await askMistral(
    [{ role: "system", content: `Réponds uniquement en JSON: {"translation":"..."}. Traduis fidèlement en ${targetLanguage}.` }, { role: "user", content: rows[0].text }],
    () => ({ translation: rows[0].text, generated_by_ai: false }),
  );
  res.json(translated);
}));

app.post("/api/books/:bookId/rating", auth, asyncRoute(async (req, res) => {
  const value = Number(req.body.value);
  if (value < 1 || value > 5) return res.status(400).json({ message: "La note doit être entre 1 et 5." });
  await pool.query(
    "INSERT INTO ratings (user_id, book_id, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
    [req.user.id, req.params.bookId, value],
  );
  const [aggregate] = await pool.query("SELECT COALESCE(AVG(value),0) average, COUNT(*) count FROM ratings WHERE book_id=?", [req.params.bookId]);
  res.json({ message: "Note enregistrée.", value, average: Number(aggregate[0].average), count: aggregate[0].count });
}));
app.get("/api/books/:bookId/rating", optionalAuth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT COALESCE(AVG(value),0) average, COUNT(*) count FROM ratings WHERE book_id=?", [req.params.bookId]);
  let userValue = null;
  if (req.user) {
    const [mine] = await pool.query("SELECT value FROM ratings WHERE user_id=? AND book_id=?", [req.user.id, req.params.bookId]);
    userValue = mine[0]?.value ?? null;
  }
  res.json({ average: Number(rows[0].average), count: rows[0].count, user_value: userValue });
}));

const getBookContext = async (bookId) => {
  const [rows] = await pool.query(`${bookSelect} WHERE b.id=? GROUP BY b.id`, [bookId]);
  if (!rows[0]) throw Object.assign(new Error("Livre introuvable."), { status: 404 });
  return shapeBook(rows[0]);
};
app.get("/api/ai/books/:bookId/summary", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM summaries WHERE user_id=? AND book_id=? AND language=? LIMIT 1", [req.user.id, req.params.bookId, req.user.preferred_language]);
  res.json(rows[0] || null);
}));
app.post("/api/ai/books/:bookId/summary", auth, asyncRoute(async (req, res) => {
  const book = await getBookContext(req.params.bookId);
  const targetLanguage = ({ fr: "français", en: "anglais", ar: "arabe" })[req.user.preferred_language] || "français";
  const generated = await askMistral(
    [{ role: "system", content: `Réponds uniquement en JSON: {"summary":"..."}. Traduis fidèlement le résumé fourni en ${targetLanguage}, sans ajouter d'information.` },
     { role: "user", content: `Titre: ${book.title}\nRésumé original: ${book.description || `${book.title}, par ${book.authors.join(", ")}`}` }],
    () => ({ summary: book.description || `${book.title} — ${book.authors.join(", ")}`, generated_by_ai: false }),
  );
  await pool.query(
    `INSERT INTO summaries (user_id, book_id, language, summary, generated_by_ai) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE language=VALUES(language), summary=VALUES(summary), generated_by_ai=VALUES(generated_by_ai), created_at=CURRENT_TIMESTAMP`,
    [req.user.id, book.id, req.user.preferred_language, generated.summary, generated.generated_by_ai],
  );
  res.status(201).json({ ...generated, owner_id: req.user.id });
}));
app.post("/api/ai/books/:bookId/summary/audio", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT summary, language, created_at FROM summaries WHERE user_id=? AND book_id=? AND language=? LIMIT 1",
    [req.user.id, req.params.bookId, req.user.preferred_language],
  );
  if (!rows[0]) return res.status(404).json({ message: "Aucun résumé traduit disponible." });
  if (!env.elevenLabsApiKey || env.elevenLabsApiKey === "your_new_elevenlabs_key_here") {
    return res.status(503).json({ message: "La lecture audio n’est pas configurée. Ajoutez une nouvelle clé ElevenLabs privée dans backend/.env.", code: "elevenlabs_not_configured" });
  }
  if (Date.now() < elevenLabsUnavailableUntil) return res.status(503).json({ message: "ElevenLabs est temporairement désactivé après un refus d’authentification. Vérifiez la clé puis redémarrez le backend.", code: "elevenlabs_auth_paused" });

  const digest = createHash("sha256")
    .update(`${req.user.id}|${req.params.bookId}|${rows[0].language}|${rows[0].summary}|${env.elevenLabsModel}|${env.elevenLabsVoiceId}`)
    .digest("hex");
  const filename = `${digest}.mp3`;
  const outputPath = path.join(speechCacheDir, filename);
  if (fs.existsSync(outputPath)) {
    return res.json({ audio_url: `/speech-audio/${filename}`, cached: true, provider: "elevenlabs" });
  }

  if (!speechJobs.has(digest)) {
    const job = (async () => {
      try {
        const response = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.elevenLabsVoiceId)}?output_format=mp3_44100_128`,
          {
            text: rows[0].summary.slice(0, 10000),
            model_id: env.elevenLabsModel,
            language_code: rows[0].language,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          },
          {
            headers: {
              "xi-api-key": env.elevenLabsApiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            responseType: "arraybuffer",
            timeout: env.elevenLabsTimeout,
            maxContentLength: 25 * 1024 * 1024,
          },
        );
        await fs.promises.writeFile(outputPath, Buffer.from(response.data));
      } catch (error) {
        await fs.promises.rm(outputPath, { force: true });
        let elevenLabsError = {};
        try {
          const payload = Buffer.from(error.response?.data || "").toString("utf8");
          elevenLabsError = payload ? JSON.parse(payload)?.detail || {} : {};
        } catch {
          elevenLabsError = {};
        }

        const messages = {
          fr: {
            quota: "La lecture audio est temporairement indisponible : le quota ElevenLabs du site est épuisé.",
            auth: "La lecture audio est indisponible : la clé API ElevenLabs du site est invalide ou désactivée.",
            rate: "ElevenLabs reçoit trop de demandes. Veuillez réessayer dans quelques instants.",
            generic: "La lecture audio ElevenLabs est temporairement indisponible.",
          },
          en: {
            quota: "Audio playback is temporarily unavailable because this site’s ElevenLabs quota is exhausted.",
            auth: "Audio playback is unavailable because this site’s ElevenLabs API key is invalid or disabled.",
            rate: "ElevenLabs is receiving too many requests. Please try again shortly.",
            generic: "ElevenLabs audio playback is temporarily unavailable.",
          },
          ar: {
            quota: "القراءة الصوتية غير متاحة مؤقتًا لأن حصة ElevenLabs الخاصة بالموقع قد نفدت.",
            auth: "القراءة الصوتية غير متاحة لأن مفتاح ElevenLabs API الخاص بالموقع غير صالح أو معطّل.",
            rate: "توجد طلبات كثيرة على ElevenLabs حاليًا. يرجى المحاولة بعد قليل.",
            generic: "القراءة الصوتية عبر ElevenLabs غير متاحة مؤقتًا.",
          },
        };
        const localized = messages[rows[0].language] || messages.fr;
        const errorStatus = elevenLabsError.status || elevenLabsError.code || "";
        const isQuotaError = ["quota_exceeded", "subscription_required"].includes(errorStatus);
        const isAuthenticationError = error.response?.status === 401;
        const isRateLimitError = error.response?.status === 429;
        const message = isQuotaError
          ? localized.quota
          : isAuthenticationError
            ? localized.auth
            : isRateLimitError
              ? localized.rate
              : localized.generic;
        if (isAuthenticationError) elevenLabsUnavailableUntil = Date.now() + 10 * 60 * 1000;
        throw Object.assign(new Error(message), {
          status: error.response?.status || 503,
          publicCode: isQuotaError ? "elevenlabs_quota_exceeded" : "elevenlabs_tts_unavailable",
        });
      }
    })().finally(() => speechJobs.delete(digest));
    speechJobs.set(digest, job);
  }
  await speechJobs.get(digest);
  res.status(201).json({ audio_url: `/speech-audio/${filename}`, cached: false, provider: "elevenlabs" });
}));
app.get("/api/ai/books/:bookId/quiz", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT id, question, option_a, option_b, option_c, option_d, generated_by_ai FROM quizzes WHERE user_id=? AND book_id=? ORDER BY id", [req.user.id, req.params.bookId]);
  res.json(rows);
}));
app.get("/api/books/:bookId/quiz/status", auth, asyncRoute(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT score, points, created_at FROM quiz_results
     WHERE user_id=? AND book_id=? AND week_start=DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) LIMIT 1`,
    [req.user.id, req.params.bookId],
  );
  res.json({ completed_this_week: Boolean(rows[0]), result: rows[0] || null });
}));
app.post("/api/ai/books/:bookId/quiz", auth, asyncRoute(async (req, res) => {
  const book = await getBookContext(req.params.bookId);
  const targetLanguage = ({ fr: "français", en: "anglais", ar: "arabe" })[req.user.preferred_language] || "français";
  const generated = await askMistral(
    [{ role: "system", content: `Réponds uniquement en JSON: {"questions":[{"question":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_answer":"A"}]}. Crée exactement 5 QCM en ${targetLanguage}.` },
     { role: "user", content: `Crée un quiz accessible sur ${book.title}, par ${book.authors.join(", ")}. Contexte: ${book.description || "œuvre littéraire classique"}` }],
    () => ({ generated_by_ai: false, questions: [
      { question: `Quel est le titre de cette œuvre ?`, option_a: book.title, option_b: "Une œuvre inconnue", option_c: "Le grand voyage", option_d: "Les mémoires", correct_answer: "A" },
      { question: "Où peut-on légalement lire cette édition ?", option_a: "Project Gutenberg", option_b: "Uniquement en librairie", option_c: "Nulle part", option_d: "Réseaux sociaux", correct_answer: "A" },
      { question: "Quel format favorise la lecture sur liseuse ?", option_a: "JPEG", option_b: "EPUB", option_c: "MP3", option_d: "CSV", correct_answer: "B" },
    ] }),
  );
  if (!Array.isArray(generated.questions) || generated.questions.length === 0) {
    return res.status(502).json({ message: "Mistral n’a pas retourné un QCM valide. Réessayez." });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM quizzes WHERE user_id=? AND book_id=?", [req.user.id, book.id]);
    for (const q of generated.questions.slice(0, 5)) {
      await connection.query(
        `INSERT INTO quizzes (user_id, book_id, question, option_a, option_b, option_c, option_d, correct_answer, generated_by_ai)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, book.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d, String(q.correct_answer).toUpperCase(), generated.generated_by_ai],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  const [rows] = await pool.query("SELECT id, question, option_a, option_b, option_c, option_d, generated_by_ai FROM quizzes WHERE user_id=? AND book_id=? ORDER BY id", [req.user.id, book.id]);
  res.status(201).json(rows);
}));
app.post("/api/books/:bookId/quiz/submit", auth, asyncRoute(async (req, res) => {
  const [alreadyCompleted] = await pool.query(
    `SELECT id FROM quiz_results WHERE user_id=? AND book_id=?
     AND week_start=DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) LIMIT 1`,
    [req.user.id, req.params.bookId],
  );
  if (alreadyCompleted[0]) return res.status(409).json({ message: "Vous avez déjà passé ce QCM cette semaine. Revenez lundi prochain." });
  const [questions] = await pool.query("SELECT id, correct_answer FROM quizzes WHERE user_id=? AND book_id=?", [req.user.id, req.params.bookId]);
  if (!questions.length) return res.status(400).json({ message: "Aucun quiz disponible." });
  const answers = req.body.answers || {};
  const correct = questions.filter((q) => answers[q.id]?.toUpperCase() === q.correct_answer).length;
  const score = Math.round((correct / questions.length) * 100);
  const points = correct * 10;
  await pool.query(
    "INSERT INTO quiz_results (user_id, book_id, score, points, week_start) VALUES (?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY))",
    [req.user.id, req.params.bookId, score, points],
  );
  await pool.query("UPDATE users SET score=score+?, weekly_score=weekly_score+? WHERE id=?", [points, points, req.user.id]);
  res.json({ correct, total: questions.length, score, points });
}));

app.get("/api/rank/weekly", asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT id, name, avatar_url, score, weekly_score FROM users WHERE is_blocked=0 ORDER BY weekly_score DESC, score DESC LIMIT 20");
  res.json(rows);
}));
app.post("/api/admin/rank/reset-weekly", auth, admin, asyncRoute(async (_req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query("SELECT id, weekly_score FROM users WHERE is_blocked=0 ORDER BY weekly_score DESC, score DESC");
    const weekEnd = new Date();
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    const dateOnly = (date) => date.toISOString().slice(0, 10);
    for (let index = 0; index < users.length; index++) {
      await connection.query(
        `INSERT INTO weekly_rank_history (user_id, week_start, week_end, weekly_score, rank_position)
         VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE weekly_score=VALUES(weekly_score), rank_position=VALUES(rank_position), week_end=VALUES(week_end)`,
        [users[index].id, dateOnly(weekStart), dateOnly(weekEnd), users[index].weekly_score, index + 1],
      );
    }
    await connection.query("UPDATE users SET weekly_score=0");
    await connection.commit();
    res.json({ message: "Classement enregistré dans l’historique puis réinitialisé." });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.post("/api/wishes", auth, asyncRoute(async (req, res) => {
  if (req.user.weekly_score < 50) return res.status(403).json({ message: "Il faut 50 points hebdomadaires pour envoyer un souhait." });
  const bookTitle = req.body.book_title?.trim();
  const author = req.body.author?.trim() || null;
  const message = req.body.message?.trim() || null;
  if (!bookTitle) return res.status(400).json({ message: "Le titre du livre est obligatoire." });
  const [result] = await pool.query("INSERT INTO wishes (user_id, book_title, author, message) VALUES (?, ?, ?, ?)", [
    req.user.id, bookTitle, author, message,
  ]);
  res.status(201).json({ id: result.insertId, message: "Souhait envoyé." });
}));
app.get("/api/admin/wishes", auth, admin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT w.*, u.name user_name, u.score user_score, u.weekly_score user_weekly_score FROM wishes w JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC");
  res.json(rows);
}));
app.put("/api/admin/wishes/:id", auth, admin, asyncRoute(async (req, res) => {
  if (!["pending", "accepted", "refused"].includes(req.body.status)) return res.status(400).json({ message: "Statut invalide." });
  const [rows] = await pool.query("SELECT user_id, book_title FROM wishes WHERE id=?", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ message: "Souhait introuvable." });
  await pool.query("UPDATE wishes SET status=? WHERE id=?", [req.body.status, req.params.id]);
  if (req.body.status !== "pending") {
    const accepted = req.body.status === "accepted";
    await notify(rows[0].user_id, "wish", accepted ? "Souhait accepté" : "Souhait refusé", `Votre souhait « ${rows[0].book_title} » a été ${accepted ? "accepté" : "refusé"}.`, "/profile");
  }
  res.json({ message: "Souhait mis à jour." });
}));

app.post("/api/chat/recommend", optionalAuth, asyncRoute(async (req, res) => {
  const message = req.body.message?.trim();
  if (!message) return res.status(400).json({ message: "Question requise." });
  const normalized = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ignored = new Set(["avec","dans","pour","vous","votre","veux","voudrais","cherche","livre","roman","histoire","populaire","popular","francais","french","anglais","english","book","read","want","اريد","كتاب"]);
  const terms = [...new Set(normalized.match(/[\p{L}\p{N}]+/gu)?.filter((word) => word.length > 2 && !ignored.has(word)) || [])].slice(0, 8);
  const requestedLanguage = /fran|french/.test(normalized) ? "fr" : /anglais|english/.test(normalized) ? "en" : /عرب|arab/.test(normalized) ? "ar" : null;
  const where = [];
  const params = [];
  if (terms.length) {
    where.push(`(${terms.map(() => "(b.title LIKE ? OR b.description LIKE ? OR c.name LIKE ? OR a.gutendex_author_name LIKE ?)").join(" OR ")})`);
    params.push(...terms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`]));
  }
  if (requestedLanguage) { where.push("b.language=?"); params.push(requestedLanguage); }
  let [books] = await pool.query(`${bookSelect}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} GROUP BY b.id ORDER BY b.download_count DESC, average_rating DESC LIMIT 5`, params);
  if (!books.length) {
    [books] = await pool.query(`${bookSelect}${requestedLanguage ? " WHERE b.language=?" : ""} GROUP BY b.id ORDER BY b.download_count DESC, average_rating DESC LIMIT 5`, requestedLanguage ? [requestedLanguage] : []);
  }
  const shaped = books.map(shapeBook);
  const targetLanguage = ({ fr: "français", en: "anglais", ar: "arabe" })[req.user?.preferred_language] || "français";
  const generated = await askMistral(
    [{ role: "system", content: `Réponds uniquement en JSON valide: {"reply":"..."}. Réponds en ${targetLanguage}. Recommande exclusivement 1 à 3 titres de la liste MySQL fournie.` },
     { role: "user", content: `Demande: ${message}\nLivres MySQL:\n${shaped.map((book) => `${book.id}: ${book.title}; langue=${book.language}; auteurs=${book.authors.join(", ")}; catégories=${book.categories.slice(0,4).join(", ")}; téléchargements=${book.download_count}; description=${book.description || "indisponible"}`).join("\n")}` }],
    () => ({ reply: shaped.length ? `Dans la base, je vous recommande ${shaped.slice(0,3).map((book) => `« ${book.title} »`).join(", ")}. Cette sélection privilégie les titres disponibles les plus populaires correspondant à votre demande.` : "Aucun livre correspondant n’est actuellement enregistré dans la base.", generated_by_ai: false }),
  );
  const reply = typeof generated.reply === "string" && generated.reply.trim() ? generated.reply.trim() : shaped.map((book) => book.title).join(" · ");
  res.json({ reply, generated_by_ai: Boolean(generated.generated_by_ai), books: shaped });
}));

app.post("/api/chat/recommend-legacy", optionalAuth, asyncRoute(async (req, res) => {
  const message = req.body.message?.trim();
  if (!message) return res.status(400).json({ message: "Question requise." });
  const stopWords = new Set(["avec","dans","pour","mais","donc","alors","vous","votre","veux","voudrais","cherche","livre","roman","histoire","quelque","chose","tres","plus","moins","court","facile","lecture"]);
  const terms = [...new Set(
    message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stopWords.has(word)),
  )].slice(0, 8);
  const conditions = terms.length ? terms.map(() => "(b.title LIKE ? OR b.description LIKE ? OR c.name LIKE ?)").join(" OR ") : "1=1";
  const params = terms.flatMap((term) => [`%${term}%`, `%${term}%`, `%${term}%`]);
  let [books] = await pool.query(`${bookSelect} WHERE ${conditions} GROUP BY b.id ORDER BY b.download_count DESC LIMIT 5`, params);
  if (!books.length) {
    [books] = await pool.query(`${bookSelect} GROUP BY b.id ORDER BY b.download_count DESC LIMIT 5`);
  }
  const shaped = books.map(shapeBook);
  const targetLanguage = ({ fr: "français", en: "anglais", ar: "arabe" })[req.user?.preferred_language] || "français";
  const generated = await askMistral(
    [{ role: "system", content: `Réponds uniquement en JSON: {"reply":"..."}. Recommande seulement les livres fournis, en ${targetLanguage}.` },
     { role: "user", content: `Demande: ${message}\nLivres disponibles:\n${shaped.map((b) => `${b.id}: ${b.title}; auteurs: ${b.authors.join(", ")}; catégories: ${b.categories.slice(0,4).join(", ")}; description: ${b.description || "indisponible"}`).join("\n") || "aucun"}` }],
    () => ({ reply: shaped.length ? `Je vous conseille ${shaped.slice(0, 3).map((b) => `« ${b.title} »`).join(", ")}. Ces titres correspondent le mieux à votre recherche.` : "Je n’ai pas encore trouvé de livre correspondant dans notre catalogue.", generated_by_ai: false }),
  );
  res.json({ ...generated, books: shaped });
}));

app.get("/api/admin/stats", auth, admin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM books) books,
     (SELECT COUNT(*) FROM comments) comments, (SELECT COUNT(*) FROM wishes WHERE status='pending') pending_wishes`,
  );
  res.json(rows[0]);
}));
app.get("/api/admin/users", auth, admin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.preferred_language, u.score, u.weekly_score, u.is_blocked, u.created_at,
     (SELECT COUNT(*) FROM comments c WHERE c.user_id=u.id) comment_count,
     (SELECT COUNT(*) FROM ratings r WHERE r.user_id=u.id) rating_count,
     (SELECT COUNT(*) FROM favorites f WHERE f.user_id=u.id) favorite_count,
     (SELECT COUNT(*) FROM quiz_results qr WHERE qr.user_id=u.id) quiz_count,
     (SELECT COALESCE(AVG(r2.value),0) FROM ratings r2 WHERE r2.user_id=u.id) average_rating_given
     FROM users u ORDER BY u.weekly_score DESC, u.score DESC`,
  );
  res.json(rows);
}));
app.get("/api/admin/users/:id/activity", auth, admin, asyncRoute(async (req, res) => {
  const [users] = await pool.query("SELECT id, name, email, role, avatar_url, preferred_language, score, weekly_score, is_blocked, created_at FROM users WHERE id=?", [req.params.id]);
  if (!users[0]) return res.status(404).json({ message: "Utilisateur introuvable." });
  const [comments] = await pool.query("SELECT c.id, c.text, c.created_at, b.id book_id, b.title book_title FROM comments c JOIN books b ON b.id=c.book_id WHERE c.user_id=? ORDER BY c.created_at DESC", [req.params.id]);
  const [ratings] = await pool.query("SELECT r.id, r.value, r.created_at, b.id book_id, b.title book_title FROM ratings r JOIN books b ON b.id=r.book_id WHERE r.user_id=? ORDER BY r.id DESC", [req.params.id]);
  const [quizzes] = await pool.query("SELECT qr.score, qr.points, qr.created_at, b.id book_id, b.title book_title FROM quiz_results qr JOIN books b ON b.id=qr.book_id WHERE qr.user_id=? ORDER BY qr.created_at DESC", [req.params.id]);
  const [wishes] = await pool.query("SELECT * FROM wishes WHERE user_id=? ORDER BY created_at DESC", [req.params.id]);
  const [history] = await pool.query("SELECT week_start, week_end, weekly_score, rank_position FROM weekly_rank_history WHERE user_id=? ORDER BY week_start DESC", [req.params.id]);
  res.json({ user: users[0], comments, ratings, quizzes, wishes, history });
}));
app.put("/api/admin/users/:id", auth, admin, asyncRoute(async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.toLowerCase().trim();
  const role = req.body.role;
  if (!name || !email || !["user", "admin"].includes(role)) return res.status(400).json({ message: "Nom, email et rôle valides requis." });
  if (Number(req.params.id) === req.user.id && role !== "admin") return res.status(400).json({ message: "Vous ne pouvez pas retirer votre propre rôle administrateur." });
  const [duplicate] = await pool.query("SELECT id FROM users WHERE email=? AND id<>?", [email, req.params.id]);
  if (duplicate[0]) return res.status(409).json({ message: "Cet email est déjà utilisé." });
  const preferredLanguage = ["fr", "en", "ar"].includes(req.body.preferred_language) ? req.body.preferred_language : "fr";
  const fields = ["name=?", "email=?", "role=?", "preferred_language=?", "score=?", "weekly_score=?"];
  const params = [name, email, role, preferredLanguage, Math.max(0, Number(req.body.score) || 0), Math.max(0, Number(req.body.weekly_score) || 0)];
  if (req.body.password) {
    if (req.body.password.length < 6) return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères." });
    fields.push("password=?");
    params.push(await bcrypt.hash(req.body.password, 12));
  }
  await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id=?`, [...params, req.params.id]);
  res.json({ message: "Utilisateur modifié." });
}));
app.put("/api/admin/users/:id/block", auth, admin, asyncRoute(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: "Vous ne pouvez pas bloquer votre propre compte." });
  await pool.query("UPDATE users SET is_blocked=? WHERE id=?", [req.body.is_blocked ? 1 : 0, req.params.id]);
  res.json({ message: req.body.is_blocked ? "Utilisateur bloqué." : "Utilisateur débloqué." });
}));
app.delete("/api/admin/users/:id", auth, admin, asyncRoute(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
  await pool.query("DELETE FROM users WHERE id=?", [req.params.id]);
  res.json({ message: "Utilisateur supprimé." });
}));
app.get("/api/admin/comments", auth, admin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT c.*, u.name user_name, b.title book_title FROM comments c JOIN users u ON u.id=c.user_id JOIN books b ON b.id=c.book_id ORDER BY c.created_at DESC");
  res.json(rows);
}));
app.get("/api/admin/ratings", auth, admin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query("SELECT r.id, r.value, r.created_at, u.id user_id, u.name user_name, u.avatar_url user_avatar, b.id book_id, b.title book_title FROM ratings r JOIN users u ON u.id=r.user_id JOIN books b ON b.id=r.book_id ORDER BY r.id DESC");
  res.json(rows);
}));

app.use((error, _req, res, _next) => {
  if ((error.status || 500) >= 500 && !error.publicCode) console.error(error);
  if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Cette donnée existe déjà." });
  res.status(error.status || 500).json({
    message: error.message || "Erreur interne du serveur.",
    ...(error.publicCode ? { code: error.publicCode } : {}),
  });
});

const port = env.port;
await migrateDatabase();
app.listen(port, () => console.log(`Smart Library AI API: http://localhost:${port}`));
