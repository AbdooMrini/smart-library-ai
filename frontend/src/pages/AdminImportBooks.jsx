import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Download, Eye, Plus, Search, Sparkles } from "lucide-react";
import api from "../lib/api";
import { Loader, State } from "../components/UI";

export default function AdminImportBooks() {
  const [filters, setFilters] = useState({ search: "", language: "fr", topic: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);

  const search = async (event, requestedPage = 1) => {
    event?.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      const response = (await api.get("/gutendex/search", { params: { ...filters, page: requestedPage } })).data;
      setData({ count: 0, next: null, previous: null, ...response, results: Array.isArray(response?.results) ? response.results : [] });
      setPage(requestedPage);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  const importOne = async (id) => {
    try {
      setNotice((await api.post(`/admin/gutendex/import/${id}`)).data.message);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const importBatch = async () => {
    try {
      const { data: result } = await api.post("/admin/gutendex/import-search", { ...filters, page, limit: 10 });
      setNotice(`${result.added} livre(s) ajouté(s) sur ${result.processed} traité(s).`);
    } catch (error) {
      setNotice(error.message);
    }
  };

  return <div>
    <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[.24em] text-neutral-400">Catalogue externe</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">Import Gutendex</h1>
        <p className="mt-3 leading-7 text-neutral-500">Explorez Project Gutenberg et ajoutez rapidement des livres libres de droits à votre bibliothèque.</p>
      </div>
      {data?.results?.length > 0 && <button onClick={importBatch} className="btn-dark shrink-0"><Sparkles size={17} />Importer les 10 premiers</button>}
    </header>

    <form onSubmit={(event) => search(event, 1)} className="mt-7 grid gap-3 rounded-3xl border bg-neutral-50 p-4 md:grid-cols-[1fr_150px_220px_auto] md:p-5">
      <label className="relative"><Search className="absolute left-4 top-3.5 text-neutral-400" size={18} /><input className="input pl-11" placeholder="Titre ou auteur…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
      <select className="input" value={filters.language} onChange={(event) => setFilters({ ...filters, language: event.target.value })}><option value="">Toutes les langues</option><option value="fr">Français</option><option value="en">Anglais</option><option value="es">Espagnol</option></select>
      <input className="input" placeholder="Thème : fiction, histoire…" value={filters.topic} onChange={(event) => setFilters({ ...filters, topic: event.target.value })} />
      <button className="btn-dark"><Search size={17} />Rechercher</button>
    </form>

    {notice && <button onClick={() => setNotice("")} className="my-5 flex w-full items-center justify-between rounded-2xl border bg-white p-4 text-left text-sm"><span>{notice}</span><span className="text-neutral-400">×</span></button>}

    {loading ? <Loader label="Recherche dans Gutendex…" /> : !data ? <div className="mt-7"><State title="Rechercher dans Gutendex" text="Saisissez un titre, un auteur ou un thème pour parcourir le catalogue." /></div> : (data.results?.length || 0) === 0 ? <div className="mt-7"><State title="Aucun résultat" text="Essayez un autre titre, auteur, thème ou une autre langue." /></div> : (
      <div className="mt-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-neutral-500"><strong className="text-neutral-950">{Number(data.count || 0).toLocaleString()}</strong> résultat(s) · page {page}</p><div className="flex gap-2"><button disabled={!data.previous || loading} onClick={() => search(null, Math.max(1, page - 1))} className="btn-light px-4 py-2"><ChevronLeft size={16}/>Précédent</button><button disabled={!data.next || loading} onClick={() => search(null, page + 1)} className="btn-dark px-4 py-2">Suivant<ChevronRight size={16}/></button></div></div>
        <div className="space-y-3">
        {data?.results?.map((book) => <article key={book.id} className="grid gap-4 rounded-3xl border bg-white p-4 transition hover:border-neutral-400 hover:shadow-md sm:grid-cols-[82px_1fr_auto] sm:items-center">
          {book.formats?.["image/jpeg"] ? <img className="h-28 w-20 rounded-xl object-cover shadow-sm" src={book.formats["image/jpeg"]} alt="" /> : <div className="grid h-28 w-20 place-items-center rounded-xl bg-neutral-100"><BookOpen size={28} className="text-neutral-300" /></div>}
          <div className="min-w-0">
            <h2 className="font-bold leading-snug">{book.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{(book.authors || []).map((author) => author.name).join(", ") || "Auteur inconnu"} · {(book.languages || []).join(", ").toUpperCase()}</p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-400">{(book.subjects || []).slice(0, 4).join(" · ") || "Aucune catégorie"}</p>
            <p className="mt-3 flex items-center gap-1 text-xs font-semibold"><Download size={13} />{Number(book.download_count || 0).toLocaleString()} téléchargements</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <a target="_blank" rel="noreferrer" href={`https://gutendex.com/books/${book.id}`} className="btn-light" title="Voir les données Gutendex"><Eye size={16} />Voir</a>
            <button onClick={() => importOne(book.id)} className="btn-dark"><Plus size={16} />Ajouter</button>
          </div>
        </article>)}
        </div>
        <div className="mt-6 flex justify-center gap-2"><button disabled={!data.previous || loading} onClick={() => search(null, Math.max(1, page - 1))} className="btn-light"><ChevronLeft size={16}/>Précédent</button><span className="rounded-full bg-neutral-100 px-5 py-3 text-sm font-bold">Page {page}</span><button disabled={!data.next || loading} onClick={() => search(null, page + 1)} className="btn-dark">Suivant<ChevronRight size={16}/></button></div>
      </div>
    )}
  </div>;
}
