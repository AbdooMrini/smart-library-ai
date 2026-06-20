import axios from "axios";

const api = axios.create({ baseURL: "https://gutendex.com", timeout: 15000 });

export async function searchGutendex(params = {}) {
  const { data } = await api.get("/books/", {
    params: {
      search: params.search || undefined,
      languages: params.language || undefined,
      topic: params.topic || undefined,
      page: params.page || 1,
    },
  });
  return data;
}

export async function getGutendexBook(id) {
  const { data } = await api.get(`/books/${Number(id)}/`);
  return data;
}

export function normalizeBook(book) {
  const formats = book.formats || {};
  const pick = (prefix) =>
    Object.entries(formats).find(([type]) => type.startsWith(prefix) && !type.includes("zip"))?.[1] || null;
  return {
    gutendex_id: book.id,
    title: book.title,
    description: book.summaries?.[0] || null,
    language: book.languages?.[0] || "inconnue",
    cover_image: formats["image/jpeg"] || null,
    html_url: pick("text/html"),
    epub_url: pick("application/epub+zip"),
    text_url: pick("text/plain"),
    download_count: book.download_count || 0,
    source: "Project Gutenberg / Gutendex",
    authors: book.authors || [],
    categories: [...new Set([...(book.subjects || []), ...(book.bookshelves || [])])].slice(0, 20),
  };
}
