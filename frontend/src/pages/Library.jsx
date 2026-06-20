import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../lib/api";
import { BookCard, Loader, State } from "../components/UI";
import { useLanguage } from "../context/LanguageContext";

export default function LibraryPage({ favorites = false }) {
  const { t } = useLanguage();
  const [data, setData] = useState({ books: [], pagination: {} });
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ search: "", category: "", language: "", page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const removeFavorite = async (bookId) => {
    try {
      await api.delete(`/favorites/${bookId}`);
      setData((current) => ({ ...current, books: current.books.filter((book) => book.id !== bookId) }));
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    setLoading(true); setError("");
    const request = favorites ? api.get("/favorites") : api.get("/books", { params: { ...filters, limit: 12 } });
    request.then(({ data: result }) => setData(favorites ? { books: result, pagination: {} } : result)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [favorites, filters]);
  return <section className="container-page py-14">
    <p className="text-xs font-bold uppercase tracking-[.25em] text-neutral-500">{favorites ? "Votre sélection" : "Catalogue"}</p>
    <h1 className="display mt-3 text-5xl sm:text-7xl">{favorites ? t("myFavorites") : t("findReading")}</h1>
    {!favorites && <div className="my-10 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_220px_160px]">
      <label className="relative"><Search className="absolute left-4 top-3.5 text-neutral-400" size={19}/><input className="input pl-11" placeholder={t("searchBooks")} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}/></label>
      <select className="input" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}><option value="">{t("allCategories")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select className="input" value={filters.language} onChange={(e) => setFilters({ ...filters, language: e.target.value, page: 1 })}><option value="">{t("allLanguages")}</option><option value="fr">{t("french")}</option><option value="en">{t("english")}</option><option value="ar">{t("arabic")}</option></select>
    </div>}
    {loading ? <Loader /> : error ? <State title="Impossible de charger" text={error}/> : data.books.length === 0 ? <State title="Aucun livre trouvé" text="Essayez une recherche plus large."/> :
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{data.books.map((b) => <BookCard key={b.id} book={b} onRemoveFavorite={favorites ? removeFavorite : undefined}/>)}</div>}
    {data.pagination.pages > 1 && <div className="mt-10 flex justify-center gap-2"><button className="btn-light" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>Précédent</button><span className="grid place-items-center px-4 text-sm">Page {filters.page} / {data.pagination.pages}</span><button className="btn-dark" disabled={filters.page >= data.pagination.pages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Suivant</button></div>}
  </section>;
}
