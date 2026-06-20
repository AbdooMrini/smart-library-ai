import { BookOpen, Download, Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";

export function Loader({ label = "Chargement…" }) {
  return <div className="flex min-h-48 items-center justify-center gap-3 text-neutral-500"><span className="size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />{label}</div>;
}
export function State({ title, text }) {
  return <div className="card p-10 text-center"><BookOpen className="mx-auto mb-3 text-neutral-400" size={32} /><h3 className="font-bold">{title}</h3>{text && <p className="mt-2 text-sm text-neutral-500">{text}</p>}</div>;
}
export function BookCard({ book, onRemoveFavorite }) {
  return <article className="group overflow-hidden rounded-3xl border bg-white">
    <Link to={`/books/${book.id}`} className="block aspect-[4/5] overflow-hidden bg-neutral-100">
      {book.cover_image ? <img src={book.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center"><BookOpen size={50} className="text-neutral-300" /></div>}
    </Link>
    <div className="p-5">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400"><span>{book.language}</span><span className="flex items-center gap-1"><Star size={13} fill="currentColor" />{Number(book.average_rating || 0).toFixed(1)}</span></div>
      <Link to={`/books/${book.id}`}><h3 className="line-clamp-2 min-h-12 font-bold leading-snug group-hover:underline">{book.title}</h3></Link>
      <p className="mt-2 truncate text-sm text-neutral-500">{book.authors?.join(", ") || "Auteur inconnu"}</p>
      <div className="mt-3 flex gap-3 text-xs text-neutral-400"><span className="flex items-center gap-1"><Heart size={12} />{book.favorite_count || 0}</span><span className="flex items-center gap-1"><Download size={12} />{Number(book.download_count || 0).toLocaleString()}</span></div>
      {onRemoveFavorite && <button onClick={() => onRemoveFavorite(book.id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"><Heart size={14} fill="currentColor" />Retirer des favoris</button>}
    </div>
  </article>;
}
export function SectionTitle({ eyebrow, title, text }) {
  return <div className="mb-9 max-w-2xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.25em] text-neutral-500">{eyebrow}</p><h2 className="display text-3xl sm:text-5xl">{title}</h2>{text && <p className="mt-4 text-neutral-600">{text}</p>}</div>;
}
