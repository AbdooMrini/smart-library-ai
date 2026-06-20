import pool from "../config/db.js";
import { normalizeBook } from "./gutendex.js";

export async function importBook(rawBook) {
  const book = normalizeBook(rawBook);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query("SELECT id FROM books WHERE gutendex_id = ?", [book.gutendex_id]);
    if (existing[0]) {
      await connection.rollback();
      return { id: existing[0].id, added: false };
    }
    const [result] = await connection.query(
      `INSERT INTO books
       (gutendex_id, title, description, language, cover_image, html_url, epub_url, text_url, download_count, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        book.gutendex_id, book.title, book.description, book.language, book.cover_image,
        book.html_url, book.epub_url, book.text_url, book.download_count, book.source,
      ],
    );
    for (const author of book.authors) {
      const [found] = await connection.query("SELECT id FROM authors WHERE gutendex_author_name = ?", [author.name]);
      let authorId = found[0]?.id;
      if (!authorId) {
        const [created] = await connection.query(
          "INSERT INTO authors (gutendex_author_name, birth_year, death_year) VALUES (?, ?, ?)",
          [author.name, author.birth_year ?? null, author.death_year ?? null],
        );
        authorId = created.insertId;
      }
      await connection.query("INSERT IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)", [result.insertId, authorId]);
    }
    for (const category of book.categories) {
      const [found] = await connection.query("SELECT id FROM categories WHERE name = ?", [category]);
      let categoryId = found[0]?.id;
      if (!categoryId) {
        const [created] = await connection.query("INSERT INTO categories (name) VALUES (?)", [category]);
        categoryId = created.insertId;
      }
      await connection.query("INSERT IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)", [result.insertId, categoryId]);
    }
    await connection.commit();
    return { id: result.insertId, added: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
