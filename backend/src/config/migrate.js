import pool from "./db.js";

async function hasColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) count FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column],
  );
  return rows[0].count > 0;
}

export async function migrateDatabase() {
  if (!(await hasColumn("users", "avatar_url"))) {
    await pool.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER role");
  }
  if (!(await hasColumn("users", "preferred_language"))) {
    await pool.query("ALTER TABLE users ADD COLUMN preferred_language ENUM('fr','en','ar') NOT NULL DEFAULT 'fr' AFTER avatar_url");
  }
  if (!(await hasColumn("ratings", "created_at"))) {
    await pool.query("ALTER TABLE ratings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  }
  await pool.query(
    `CREATE TABLE IF NOT EXISTS weekly_rank_history (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      week_start DATE NOT NULL,
      week_end DATE NOT NULL,
      weekly_score INT NOT NULL DEFAULT 0,
      rank_position INT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_week (user_id, week_start),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS user_likes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      liker_user_id INT UNSIGNED NOT NULL,
      liked_user_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_like (liker_user_id, liked_user_id),
      FOREIGN KEY (liker_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (liked_user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS profile_views (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      viewed_user_id INT UNSIGNED NOT NULL,
      viewer_user_id INT UNSIGNED NULL,
      visitor_key VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_profile_views_user (viewed_user_id, created_at),
      FOREIGN KEY (viewed_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (viewer_user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS public_summaries (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      book_id INT UNSIGNED NOT NULL,
      text MEDIUMTEXT NOT NULL,
      language ENUM('fr','en','ar') NOT NULL DEFAULT 'fr',
      view_count INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      INDEX idx_public_summaries_book (book_id, created_at)
    )`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS public_summary_likes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      summary_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_public_summary_like (summary_id, user_id),
      FOREIGN KEY (summary_id) REFERENCES public_summaries(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS public_summary_comments (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      summary_id INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (summary_id) REFERENCES public_summaries(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
  );
  if (!(await hasColumn("quiz_results", "week_start"))) {
    await pool.query("ALTER TABLE quiz_results ADD COLUMN week_start DATE NULL AFTER points");
    await pool.query("UPDATE quiz_results SET week_start=DATE_SUB(DATE(created_at), INTERVAL WEEKDAY(created_at) DAY) WHERE week_start IS NULL");
    await pool.query("ALTER TABLE quiz_results MODIFY week_start DATE NOT NULL");
    await pool.query(
      `DELETE q1 FROM quiz_results q1 JOIN quiz_results q2
       ON q1.user_id=q2.user_id AND q1.book_id=q2.book_id AND q1.week_start=q2.week_start AND q1.id<q2.id`,
    );
    await pool.query("ALTER TABLE quiz_results ADD UNIQUE KEY uq_quiz_user_book_week (user_id, book_id, week_start)");
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NOT NULL, type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL, message TEXT NOT NULL, link VARCHAR(500) NULL, is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_notifications_user (user_id, is_read, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS support_tickets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NOT NULL, subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL, admin_reply TEXT NULL, status ENUM('open','answered','closed') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS support_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ticket_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
    message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_support_messages_ticket (ticket_id, created_at))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS reports (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, reporter_user_id INT UNSIGNED NOT NULL,
    target_type ENUM('user','comment','summary') NOT NULL, target_id INT UNSIGNED NOT NULL, reason TEXT NOT NULL,
    admin_reply TEXT NULL, status ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reports_status (status, created_at), FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS report_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, report_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
    message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_report_messages_report (report_id, created_at))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS user_blocks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, blocker_user_id INT UNSIGNED NOT NULL, blocked_user_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_block (blocker_user_id, blocked_user_id),
    FOREIGN KEY (blocker_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS conversations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, type ENUM('private','group','book') NOT NULL, name VARCHAR(255) NULL,
    image_url VARCHAR(500) NULL, book_id INT UNSIGNED NULL, created_by INT UNSIGNED NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE, FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS conversation_members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, conversation_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
    role ENUM('member','admin') NOT NULL DEFAULT 'member', joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_conversation_member (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS conversation_bans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, conversation_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
    banned_by INT UNSIGNED NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_conversation_ban (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE CASCADE)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, conversation_id INT UNSIGNED NOT NULL, user_id INT UNSIGNED NOT NULL,
    text TEXT NULL, audio_url VARCHAR(500) NULL, is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_messages_conversation (conversation_id, created_at))`);
  if (!(await hasColumn("summaries", "user_id"))) {
    await pool.query("DELETE FROM summaries");
    await pool.query(
      `ALTER TABLE summaries
       ADD COLUMN user_id INT UNSIGNED NOT NULL AFTER id,
       ADD UNIQUE KEY uq_user_book_summary (user_id, book_id),
       ADD CONSTRAINT fk_summaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
    );
  }
  if (!(await hasColumn("summaries", "language"))) {
    await pool.query("ALTER TABLE summaries ADD COLUMN language ENUM('fr','en','ar') NOT NULL DEFAULT 'fr' AFTER book_id");
  }

  if (!(await hasColumn("quizzes", "user_id"))) {
    await pool.query("DELETE FROM quizzes");
    await pool.query(
      `ALTER TABLE quizzes
       ADD COLUMN user_id INT UNSIGNED NOT NULL AFTER id,
       ADD INDEX idx_quizzes_user_book (user_id, book_id),
       ADD CONSTRAINT fk_quizzes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,
    );
  }
}
