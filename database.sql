CREATE DATABASE IF NOT EXISTS smart_library_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_library_ai;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS conversation_bans, user_blocks, report_messages, support_messages,
  messages, conversation_members, conversations, notifications, reports, support_tickets,
  public_summary_comments, public_summary_likes, public_summaries, profile_views, user_likes,
  weekly_rank_history, quiz_results, quizzes, summaries, ratings, comments, favorites, wishes,
  book_categories, book_authors, categories, authors, books, users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  avatar_url VARCHAR(500) NULL,
  preferred_language ENUM('fr','en','ar') NOT NULL DEFAULT 'fr',
  score INT NOT NULL DEFAULT 0,
  weekly_score INT NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE authors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  gutendex_author_name VARCHAR(255) NOT NULL UNIQUE,
  birth_year SMALLINT NULL,
  death_year SMALLINT NULL
);
CREATE TABLE categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);
CREATE TABLE books (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  gutendex_id INT NULL UNIQUE,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  language VARCHAR(20) NOT NULL DEFAULT 'fr',
  cover_image TEXT NULL,
  html_url TEXT NULL,
  epub_url TEXT NULL,
  text_url TEXT NULL,
  download_count INT NOT NULL DEFAULT 0,
  source VARCHAR(255) NOT NULL DEFAULT 'Project Gutenberg / Gutendex',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_books_title (title(191)),
  INDEX idx_books_language (language),
  INDEX idx_books_downloads (download_count)
);
CREATE TABLE book_authors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_book_author (book_id, author_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);
CREATE TABLE book_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_book_category (book_id, category_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
CREATE TABLE favorites (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_favorite (user_id, book_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE TABLE comments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE TABLE ratings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  value TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rating (user_id, book_id),
  CONSTRAINT chk_rating CHECK (value BETWEEN 1 AND 5),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE TABLE summaries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  language ENUM('fr','en','ar') NOT NULL DEFAULT 'fr',
  summary MEDIUMTEXT NOT NULL,
  generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_book_summary (user_id, book_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE TABLE quizzes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer ENUM('A','B','C','D') NOT NULL,
  generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE TABLE quiz_results (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  book_id INT UNSIGNED NOT NULL,
  score TINYINT UNSIGNED NOT NULL,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  week_start DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quiz_user_book_week (user_id, book_id, week_start),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
CREATE TABLE user_likes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  liker_user_id INT UNSIGNED NOT NULL,
  liked_user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_like (liker_user_id, liked_user_id),
  FOREIGN KEY (liker_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (liked_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE profile_views (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  viewed_user_id INT UNSIGNED NOT NULL,
  viewer_user_id INT UNSIGNED NULL,
  visitor_key VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_profile_views_user (viewed_user_id, created_at),
  FOREIGN KEY (viewed_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (viewer_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE public_summaries (
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
);
CREATE TABLE public_summary_likes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  summary_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_public_summary_like (summary_id, user_id),
  FOREIGN KEY (summary_id) REFERENCES public_summaries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE public_summary_comments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  summary_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (summary_id) REFERENCES public_summaries(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE wishes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  book_title VARCHAR(500) NOT NULL,
  author VARCHAR(255) NULL,
  message TEXT NULL,
  status ENUM('pending','accepted','refused') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE weekly_rank_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  weekly_score INT NOT NULL DEFAULT 0,
  rank_position INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_week (user_id, week_start),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id, is_read, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE support_tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  admin_reply TEXT NULL,
  status ENUM('open','answered','closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE support_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_messages_ticket (ticket_id, created_at),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE reports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_user_id INT UNSIGNED NOT NULL,
  target_type ENUM('user','comment','summary') NOT NULL,
  target_id INT UNSIGNED NOT NULL,
  reason TEXT NOT NULL,
  admin_reply TEXT NULL,
  status ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reports_status (status, created_at),
  FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE report_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_messages_report (report_id, created_at),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE user_blocks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  blocker_user_id INT UNSIGNED NOT NULL,
  blocked_user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_block (blocker_user_id, blocked_user_id),
  FOREIGN KEY (blocker_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE conversations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type ENUM('private','group','book') NOT NULL,
  name VARCHAR(255) NULL,
  image_url VARCHAR(500) NULL,
  book_id INT UNSIGNED NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE conversation_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('member','admin') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conversation_member (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE conversation_bans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  banned_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conversation_ban (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  text TEXT NULL,
  audio_url VARCHAR(500) NULL,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id, created_at)
);

-- Mot de passe des deux comptes de démonstration : password
INSERT INTO users (name, email, password, role, score, weekly_score) VALUES
('Admin Smart Library', 'admin@smartlibrary.local', '$2b$12$5RpZc8EKHV321Iyr6imjxeTz1rs9ALfgb3X.6Ttd167kCT4YJGRH.', 'admin', 100, 50),
('Lectrice Démo', 'user@smartlibrary.local', '$2b$12$5RpZc8EKHV321Iyr6imjxeTz1rs9ALfgb3X.6Ttd167kCT4YJGRH.', 'user', 80, 30);
