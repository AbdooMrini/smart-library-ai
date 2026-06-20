import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  Eye,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  Shield,
  Star,
  Trash,
  UserRound,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import api from "../lib/api";
import { Loader, State } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { assetUrl } from "../lib/assets";
import { ConfirmDialog } from "../components/Dialogs";

const showError = (setter) => (error) => setter(error.message || "Une erreur est survenue.");

export function AdminLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    ["/admin", "Vue générale", LayoutDashboard],
    ["/admin/import", "Import Gutendex", WandSparkles],
    ["/admin/users", "Utilisateurs", UserRound],
    ["/admin/content", "Contenu", BookOpen],
    ["/admin/moderation", "Support & signalements", LifeBuoy],
  ];
  const navigation = <>{links.map(([to,label,Icon]) => <NavLink onClick={() => setMobileOpen(false)} end={to === "/admin"} key={to} to={to} className={({ isActive }) => `group mb-1 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${isActive ? "bg-white text-neutral-950 shadow-lg" : "text-neutral-400 hover:bg-white/10 hover:text-white"}`}><Icon size={18} /><span className="flex-1">{label}</span><ArrowUpRight size={14} className="opacity-0 transition group-hover:opacity-100" /></NavLink>)}</>;

  return <section className="min-h-[calc(100vh-74px)] bg-[#f2f2ef]">
    <div className="container-page py-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between rounded-2xl border bg-white p-3 shadow-sm lg:hidden">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-neutral-950 text-white"><Shield size={19} /></span><div><p className="font-bold">Administration</p><p className="text-xs text-neutral-400">Smart Library AI</p></div></div>
        <button onClick={() => setMobileOpen(true)} className="rounded-xl border p-2.5"><Menu size={20} /></button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-24 hidden min-h-[calc(100vh-8rem)] overflow-hidden rounded-[2rem] bg-neutral-950 p-4 text-white shadow-2xl lg:flex lg:flex-col">
          <div className="p-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-white text-neutral-950"><Shield size={23} /></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.24em] text-neutral-500">Smart Library AI</p>
            <h1 className="mt-2 text-2xl font-bold">Espace administration</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-400">Pilotez les lecteurs, le catalogue et la modération.</p>
          </div>
          <nav className="mt-5">{navigation}</nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">{user?.avatar_url ? <img src={assetUrl(user.avatar_url)} className="size-10 rounded-xl object-cover" alt="" /> : <span className="grid size-10 place-items-center rounded-xl bg-white/10"><UserRound size={19} /></span>}<div className="min-w-0"><p className="truncate text-sm font-bold">{user?.name}</p><p className="truncate text-xs text-neutral-500">{user?.email}</p></div></div>
          </div>
        </aside>

        <main className="min-w-0 rounded-[2rem] border bg-white p-5 shadow-sm sm:p-8 lg:p-10"><Outlet /></main>
      </div>
    </div>

    {mobileOpen && <div className="fixed inset-0 z-[90] bg-black/60 lg:hidden" onMouseDown={() => setMobileOpen(false)}><aside onMouseDown={(event) => event.stopPropagation()} className="h-full w-[min(88vw,320px)] overflow-y-auto bg-neutral-950 p-4 text-white shadow-2xl"><div className="mb-7 flex items-center justify-between p-3"><div><p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Smart Library AI</p><h2 className="mt-1 text-xl font-bold">Administration</h2></div><button onClick={() => setMobileOpen(false)} className="rounded-xl border border-white/15 p-2"><X size={19} /></button></div><nav>{navigation}</nav></aside></div>}
  </section>;
}

export function AdminDashboard() {
  const { refresh } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const load = async () => {
    const [statsResponse, usersResponse] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users")]);
    setStats(statsResponse.data);
    setUsers(usersResponse.data);
  };
  useEffect(() => { load().catch(showError(setNotice)); }, []);
  const reset = async () => {
    try {
      setBusy(true);
      setNotice((await api.post("/admin/rank/reset-weekly")).data.message);
      await load();
      await refresh();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };
  const statCards = stats ? [
    { key: "users", label: "Utilisateurs", value: stats.users, icon: Users, tone: "bg-blue-50 text-blue-700", link: "/admin/users" },
    { key: "books", label: "Livres", value: stats.books, icon: BookOpen, tone: "bg-violet-50 text-violet-700", link: "/admin/content" },
    { key: "comments", label: "Commentaires", value: stats.comments, icon: MessageCircle, tone: "bg-emerald-50 text-emerald-700", link: "/admin/content" },
    { key: "pending_wishes", label: "Souhaits en attente", value: stats.pending_wishes, icon: Clock3, tone: "bg-amber-50 text-amber-700", link: "/admin/content" },
  ] : [];
  return <div>
    <AdminPageHeader eyebrow="Centre de contrôle" title="Tableau de bord" text="Suivez les chiffres clés, l’activité des lecteurs et le classement hebdomadaire." />
    {notice && <p className="mt-5 rounded-xl border bg-neutral-50 p-3 text-sm">{notice}</p>}
    {!stats ? <Loader /> : <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statCards.map(({ key,label,value,icon: Icon,tone,link }) => <Link to={link} key={key} className="group rounded-3xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between"><span className={`grid size-12 place-items-center rounded-2xl ${tone}`}><Icon size={22} /></span><ArrowUpRight size={17} className="text-neutral-300 transition group-hover:text-neutral-950" /></div><p className="mt-6 text-4xl font-extrabold">{value}</p><p className="mt-1 text-sm text-neutral-500">{label}</p></Link>)}</div>}
    <section className="mt-8 overflow-hidden rounded-3xl border">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-neutral-50 p-5 sm:p-6"><div><h2 className="flex items-center gap-2 text-xl font-bold"><BarChart3 size={20} />Classement actuel</h2><p className="mt-1 text-sm text-neutral-500">Scores hebdomadaires et activité de tous les membres.</p></div><button disabled={busy} onClick={() => setConfirmReset(true)} className="btn-light"><RefreshCw className={busy ? "animate-spin" : ""} size={16} />Réinitialiser</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-white"><tr className="border-b text-xs uppercase tracking-wider text-neutral-400"><th className="p-4">Rang</th><th>Utilisateur</th><th>Hebdo</th><th>Total</th><th>Commentaires</th><th>Notes</th></tr></thead><tbody>{users.map((user,index) => <tr key={user.id} className="border-b last:border-0 hover:bg-neutral-50"><td className="p-4"><span className={`grid size-9 place-items-center rounded-full font-bold ${index === 0 ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}>#{index+1}</span></td><td><div className="flex items-center gap-3">{user.avatar_url ? <img src={assetUrl(user.avatar_url)} className="size-10 rounded-xl object-cover" alt="" /> : <span className="grid size-10 place-items-center rounded-xl bg-neutral-100"><UserRound size={18} /></span>}<div><p className="font-semibold">{user.name}</p><p className="text-xs text-neutral-400">{user.email}</p></div></div></td><td><strong>{user.weekly_score}</strong></td><td>{user.score}</td><td>{user.comment_count}</td><td>{user.rating_count}</td></tr>)}</tbody></table></div>
    </section>
    <ConfirmDialog open={confirmReset} title="Réinitialiser le classement ?" message="Les scores seront archivés dans l’historique avant la remise à zéro." confirmLabel="Réinitialiser" danger onCancel={() => setConfirmReset(false)} onConfirm={async () => { setConfirmReset(false); await reset(); }} />
  </div>;
}

export function AdminUsers() {
  const { user: currentUser, refresh } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [activity, setActivity] = useState(null);
  const [edit, setEdit] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      setUsers((await api.get("/admin/users")).data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const openActivity = async (user) => {
    if (selected === user.id) { setSelected(null); setActivity(null); return; }
    setSelected(user.id); setActivity(null);
    try { setActivity((await api.get(`/admin/users/${user.id}/activity`)).data); } catch (err) { setError(err.message); }
  };
  const save = async (event) => {
    event.preventDefault();
    try {
      await api.put(`/admin/users/${edit.id}`, edit);
      if (edit.id === currentUser.id) await refresh();
      setEdit(null);
      await load();
    } catch (err) { setError(err.message); }
  };
  const block = async (user) => { try { await api.put(`/admin/users/${user.id}/block`, { is_blocked: !user.is_blocked }); await load(); } catch (err) { setError(err.message); } };
  const remove = async (id) => { try { await api.delete(`/admin/users/${id}`); setPendingDelete(null); await load(); } catch (err) { setError(err.message); } };

  return <div>
    <AdminPageHeader eyebrow="Communauté" title="Gestion des utilisateurs" text="Modifiez les profils et consultez commentaires, notes, quiz et classement." actions={<div className="rounded-2xl bg-neutral-950 px-4 py-3 text-white"><span className="text-2xl font-extrabold">{users.length}</span><span className="ml-2 text-xs text-neutral-400">comptes</span></div>} />
    <label className="relative mt-7 block"><Search className="absolute left-4 top-3.5 text-neutral-400" size={18} /><input className="input pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher par nom ou adresse e-mail…" /></label>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <Loader /> : <div className="mt-6 space-y-3">{filtered.map((user,index) => <div key={user.id} className="overflow-hidden rounded-2xl border">
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <button onClick={() => openActivity(user)} className="flex min-w-0 items-center gap-4 text-left">{user.avatar_url ? <img src={assetUrl(user.avatar_url)} className="size-11 shrink-0 rounded-full object-cover" alt="" /> : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-neutral-100 font-bold">{index+1}</span>}<div className="min-w-0"><p className="truncate font-bold">{user.name} <span className="ml-2 rounded-full bg-neutral-100 px-2 py-1 text-[10px] uppercase">{user.role}</span></p><p className="truncate text-xs text-neutral-500">{user.email} · {user.preferred_language?.toUpperCase()} · {user.weekly_score} pts semaine · {user.score} total</p><p className="mt-1 text-xs text-neutral-400">{user.comment_count} commentaires · {user.rating_count} notes · {user.favorite_count} favoris · {user.quiz_count} quiz</p></div>{selected === user.id ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>
        <div className="flex flex-wrap gap-2"><button onClick={() => setEdit({ ...user, password: "" })} className="rounded-xl border p-2.5 hover:bg-neutral-100" title="Modifier"><Edit3 size={16} /></button><button onClick={() => block(user)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${user.is_blocked ? "bg-green-50 text-green-700" : ""}`}>{user.is_blocked ? "Débloquer" : "Bloquer"}</button><button onClick={() => setPendingDelete(user)} className="rounded-xl bg-red-50 p-2.5 text-red-600"><Trash size={16} /></button></div>
      </div>
      {selected === user.id && <div className="border-t bg-neutral-50 p-5">{!activity ? <Loader label="Chargement de l’activité…" /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ActivityColumn title="Commentaires" count={activity.comments.length} empty="Aucun commentaire">{activity.comments.map((item) => <Link to={`/books/${item.book_id}`} key={item.id} className="block rounded-2xl border bg-white p-4 text-sm hover:border-neutral-400"><strong>{item.book_title}</strong><p className="mt-2 line-clamp-3 leading-6 text-neutral-600">{item.text}</p><time className="mt-3 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></Link>)}</ActivityColumn>
        <ActivityColumn title="Notes données" count={activity.ratings.length} empty="Aucune note">{activity.ratings.map((item) => <Link to={`/books/${item.book_id}`} key={item.id} className="block rounded-2xl border bg-white p-4 text-sm hover:border-neutral-400"><div className="flex items-start justify-between gap-3"><strong>{item.book_title}</strong><span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800"><Star size={12} fill="currentColor" />{item.value}/5</span></div>{item.created_at && <time className="mt-3 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time>}</Link>)}</ActivityColumn>
        <ActivityColumn title="Résultats QCM" count={activity.quizzes.length} empty="Aucun quiz">{activity.quizzes.map((item,index) => <Link to={`/books/${item.book_id}`} key={index} className="block rounded-2xl border bg-white p-4 text-sm hover:border-neutral-400"><strong>{item.book_title}</strong><div className="mt-3 flex items-center justify-between"><span className="text-2xl font-extrabold">{item.score}%</span><span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">+{item.points} pts</span></div><time className="mt-3 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></Link>)}</ActivityColumn>
        <ActivityColumn title="Souhaits" count={activity.wishes?.length || 0} empty="Aucun souhait">{activity.wishes?.map((item) => <div key={item.id} className="rounded-2xl border bg-white p-4 text-sm"><div className="flex items-start justify-between gap-3"><strong>{item.book_title}</strong><span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold uppercase">{item.status}</span></div>{item.author && <p className="mt-1 text-xs text-neutral-500">{item.author}</p>}{item.message && <p className="mt-3 leading-6 text-neutral-600">{item.message}</p>}<time className="mt-3 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></div>)}</ActivityColumn>
        <ActivityColumn title="Historique du rang" count={activity.history?.length || 0} empty="Aucun historique">{activity.history?.map((item) => <div key={item.week_start} className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><strong className="text-2xl">#{item.rank_position}</strong><span className="font-bold">{item.weekly_score} pts</span></div><p className="mt-2 text-xs text-neutral-400">{new Date(item.week_start).toLocaleDateString("fr")} → {new Date(item.week_end).toLocaleDateString("fr")}</p></div>)}</ActivityColumn>
      </div>}</div>}
    </div>)}</div>}

      {edit && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={() => setEdit(null)}><form onSubmit={save} onMouseDown={(event) => event.stopPropagation()} className="card w-full max-w-lg p-7"><h3 className="display text-3xl">Modifier l’utilisateur</h3><div className="mt-6 grid gap-3"><input className="input" required value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} placeholder="Nom" /><input className="input" type="email" required value={edit.email} onChange={(event) => setEdit({ ...edit, email: event.target.value })} /><select className="input" value={edit.role} onChange={(event) => setEdit({ ...edit, role: event.target.value })}><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select><select className="input" value={edit.preferred_language || "fr"} onChange={(event) => setEdit({ ...edit, preferred_language: event.target.value })}><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select><div className="grid grid-cols-2 gap-3"><input className="input" type="number" min="0" value={edit.score} onChange={(event) => setEdit({ ...edit, score: event.target.value })} placeholder="Score total" /><input className="input" type="number" min="0" value={edit.weekly_score} onChange={(event) => setEdit({ ...edit, weekly_score: event.target.value })} placeholder="Score semaine" /></div><input className="input" type="password" minLength={6} value={edit.password} onChange={(event) => setEdit({ ...edit, password: event.target.value })} placeholder="Nouveau mot de passe (facultatif)" /></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEdit(null)} className="btn-light">Annuler</button><button className="btn-dark"><Save size={16} />Enregistrer</button></div></form></div>}
      <ConfirmDialog open={Boolean(pendingDelete)} title="Supprimer cet utilisateur ?" message={`${pendingDelete?.name || "Ce compte"} et toutes ses données associées seront définitivement supprimés.`} confirmLabel="Supprimer" danger onCancel={() => setPendingDelete(null)} onConfirm={() => remove(pendingDelete.id)} />
  </div>;
}

function ActivityColumn({ title, count = 0, empty, children }) {
  const items = Array.isArray(children) ? children : [children].filter(Boolean);
  return <section className="rounded-3xl border bg-neutral-100 p-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">{title}</h4><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold">{count}</span></div><div className="max-h-80 space-y-3 overflow-y-auto">{items.length ? items : <div className="rounded-2xl border-2 border-dashed bg-white p-6 text-center text-xs text-neutral-400">{empty}</div>}</div></section>;
}

export function AdminContent() {
  const [comments, setComments] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [books, setBooks] = useState([]);
  const [bookSearch, setBookSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingBookDelete, setPendingBookDelete] = useState(null);
  const [contentSection, setContentSection] = useState("books");
  const load = async () => {
    try {
      setError("");
      const [commentsResponse,wishesResponse,ratingsResponse,booksResponse] = await Promise.all([
        api.get("/admin/comments"), api.get("/admin/wishes"), api.get("/admin/ratings"), api.get("/books?limit=50"),
      ]);
      setComments(commentsResponse.data); setWishes(wishesResponse.data); setRatings(ratingsResponse.data); setBooks(booksResponse.data.books);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const filteredBooks = useMemo(() => books.filter((book) => `${book.title} ${book.authors?.join(" ")}`.toLowerCase().includes(bookSearch.toLowerCase())), [books, bookSearch]);
  const removeBook = async (id) => { try { await api.delete(`/books/${id}`); setPendingBookDelete(null); await load(); } catch (err) { setError(err.message); } };
  if (loading) return <Loader />;
  return <div>
    <AdminPageHeader eyebrow="Bibliothèque" title="Contenu & catalogue" text="Retrouvez les livres importés, les notes, les commentaires et les souhaits des lecteurs." actions={<div className="flex gap-2"><MetricBadge value={books.length} label="livres" /><MetricBadge value={comments.length} label="commentaires" /></div>} />{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <AdminSectionTabs value={contentSection} onChange={setContentSection} items={[["books", "Livres", books.length], ["activity", "Notes & commentaires", ratings.length + comments.length], ["wishes", "Souhaits", wishes.length]]} />
    {contentSection === "books" && <section className="mt-6 rounded-3xl border p-5 sm:p-6"><h3 className="flex items-center gap-2 font-bold"><BookOpen size={18} />Livres enregistrés</h3><label className="relative mt-4 block"><Search className="absolute left-4 top-3.5 text-neutral-400" size={17} /><input className="input pl-11" value={bookSearch} onChange={(event) => setBookSearch(event.target.value)} placeholder="Rechercher rapidement un livre…" /></label><div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">{filteredBooks.length ? filteredBooks.map((book) => <div key={book.id} className="grid gap-3 rounded-2xl bg-neutral-100 p-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center"><Link className="min-w-0 font-semibold hover:underline" to={`/books/${book.id}`}><span className="block truncate">{book.title}</span><span className="text-xs font-normal text-neutral-400">{book.authors?.join(", ")} · {book.language}</span></Link><div className="flex items-center gap-3"><span className="flex items-center gap-1 text-xs"><Star size={13} fill="currentColor" />{Number(book.average_rating).toFixed(1)} ({book.rating_count})</span><button onClick={() => setPendingBookDelete(book)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash size={16} /></button></div></div>) : <State title="Aucun livre trouvé" />}</div></section>}

    {contentSection === "activity" && <div className="mt-6 grid gap-7 lg:grid-cols-2">
      <section className="rounded-3xl border p-5"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold"><Star size={18} />Notes des lecteurs</h3><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold">{ratings.length}</span></div><div className="mt-4 max-h-96 space-y-3 overflow-y-auto">{ratings.length ? ratings.map((rating) => <div key={rating.id} className="rounded-2xl bg-neutral-100 p-4 text-sm"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3">{rating.user_avatar ? <img src={assetUrl(rating.user_avatar)} className="size-9 rounded-xl object-cover" alt="" /> : <span className="grid size-9 place-items-center rounded-xl bg-white"><UserRound size={16}/></span>}<div><Link to={`/users/${rating.user_id}`} className="font-bold hover:underline">{rating.user_name}</Link>{rating.created_at && <time className="block text-[10px] text-neutral-400">{new Date(rating.created_at).toLocaleString("fr")}</time>}</div></div><span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800"><Star size={13} fill="currentColor" />{rating.value}/5</span></div><Link to={`/books/${rating.book_id}`} className="mt-3 block truncate text-xs text-neutral-500 hover:underline">{rating.book_title}</Link></div>) : <EmptyAdmin text="Aucune note enregistrée." />}</div></section>
      <section className="rounded-3xl border p-5"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold"><MessageCircle size={18} />Commentaires récents</h3><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold">{comments.length}</span></div><div className="mt-4 max-h-96 space-y-3 overflow-y-auto">{comments.length ? comments.map((comment) => <div key={comment.id} className="flex gap-3 rounded-2xl bg-neutral-100 p-4 text-sm"><p className="min-w-0 flex-1"><strong>{comment.user_name}</strong><Link to={`/books/${comment.book_id}`} className="block truncate text-xs text-neutral-500 hover:underline">{comment.book_title}</Link><span className="mt-2 block leading-6">{comment.text}</span>{comment.created_at && <time className="mt-2 block text-[10px] text-neutral-400">{new Date(comment.created_at).toLocaleString("fr")}</time>}</p><button onClick={async () => { await api.delete(`/comments/${comment.id}`); setComments((current) => current.filter((item) => item.id !== comment.id)); }} className="self-start rounded-xl p-2 text-red-600 hover:bg-red-50"><Trash size={16} /></button></div>) : <EmptyAdmin text="Aucun commentaire récent." />}</div></section>
    </div>}

    {contentSection === "wishes" && <section className="mt-6 rounded-3xl border p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold">Souhaits de livres</h3><p className="mt-1 text-sm text-neutral-500">Décidez si chaque proposition doit rejoindre le catalogue.</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold">{wishes.length}</span></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{wishes.length ? wishes.map((wish) => <div key={wish.id} className="rounded-2xl bg-neutral-100 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{wish.book_title}</p><p className="mt-1 text-xs text-neutral-500">{wish.user_name} · {wish.author || "Auteur non précisé"}</p><p className="mt-1 text-[10px] text-neutral-400">{new Date(wish.created_at).toLocaleString("fr")} · total {wish.user_score}, semaine {wish.user_weekly_score}</p></div><select value={wish.status} onChange={async (event) => { await api.put(`/admin/wishes/${wish.id}`, { status: event.target.value }); setWishes((current) => current.map((item) => item.id === wish.id ? { ...item, status: event.target.value } : item)); }} className="rounded-xl border bg-white p-2 text-sm"><option value="pending">En attente</option><option value="accepted">Accepté</option><option value="refused">Refusé</option></select></div>{wish.message && <p className="mt-4 rounded-xl bg-white p-3 text-sm text-neutral-600">{wish.message}</p>}</div>) : <div className="lg:col-span-2"><EmptyAdmin text="Aucun souhait de livre." /></div>}</div></section>}
    <ConfirmDialog open={Boolean(pendingBookDelete)} title="Supprimer ce livre ?" message={`« ${pendingBookDelete?.title || "Ce livre"} » et toutes ses données associées seront supprimés.`} confirmLabel="Supprimer" danger onCancel={() => setPendingBookDelete(null)} onConfirm={() => removeBook(pendingBookDelete.id)} />
  </div>;
}

export function AdminModeration() {
  const [tickets, setTickets] = useState([]);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingTicketDelete, setPendingTicketDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [moderationSection, setModerationSection] = useState("support");
  const [reportFilter, setReportFilter] = useState("all");
  const load = async () => {
    try {
      const [supportResponse, reportsResponse] = await Promise.all([api.get("/admin/support"), api.get("/admin/reports")]);
      setTickets(supportResponse.data); setReports(reportsResponse.data);
    } catch (err) { setError(err.message); }
  };
  const moderate = async () => {
    if (!pendingAction) return;
    try {
      setBusy(true);
      const { data } = pendingAction.action === "dismiss_report"
        ? await api.put(`/admin/reports/${pendingAction.report.id}`, {
          status: "dismissed",
          reply: "Signalement examiné : aucun problème constaté, aucune sanction appliquée.",
        })
        : await api.post(`/admin/reports/${pendingAction.report.id}/action`, { action: pendingAction.action });
      setNotice(data.message);
      setPendingAction(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); }, []);
  const filteredReports = reportFilter === "all" ? reports : reports.filter((report) => report.target_type === reportFilter);
  const actionLabel = pendingAction?.action === "dismiss_report"
    ? "Classer comme faux signalement"
    : pendingAction?.action === "block_user"
      ? "Bloquer l’utilisateur"
      : pendingAction?.report.target_type === "summary"
        ? "Supprimer le résumé"
        : "Supprimer le commentaire";
  return <div><AdminPageHeader eyebrow="Sécurité" title="Support & signalements" text="Examinez le contenu concerné, répondez au signalement puis appliquez l’action de modération adaptée." actions={<div className="flex gap-2"><MetricBadge value={tickets.filter((item) => item.status === "open").length} label="ouverts" /><MetricBadge value={reports.filter((item) => item.status === "pending").length} label="signalements" danger /></div>} />{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <button onClick={() => setNotice("")} className="mt-4 flex w-full items-center gap-2 rounded-xl bg-emerald-50 p-3 text-left text-sm text-emerald-700"><CheckCircle2 size={17} />{notice}</button>}
    <AdminSectionTabs value={moderationSection} onChange={setModerationSection} items={[["support", "Support", tickets.length], ["reports", "Signalements", reports.length]]} />
    {moderationSection === "support" && <section className="mt-6"><div className="flex items-center justify-between"><div><h3 className="text-xl font-bold">Conversations support</h3><p className="mt-1 text-sm text-neutral-500">Chaque ticket conserve tout l’historique des échanges.</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold">{tickets.length}</span></div><div className="mt-4 space-y-4">{tickets.length ? tickets.map((ticket) => <article key={ticket.id} className="overflow-hidden rounded-3xl border"><header className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 p-5"><div><strong>{ticket.subject}</strong><p className="mt-1 text-xs text-neutral-500">{ticket.user_name} · {ticket.user_email} · {new Date(ticket.created_at).toLocaleString("fr")}</p></div><div className="flex items-center gap-2"><select value={ticket.status} onChange={async (event) => { await api.put(`/admin/support/${ticket.id}/status`, { status: event.target.value }); await load(); }} className="rounded-xl border bg-white px-3 py-2 text-xs font-bold uppercase"><option value="open">Ouvert</option><option value="answered">Répondu</option><option value="closed">Fermé</option></select><button onClick={() => setPendingTicketDelete(ticket)} className="rounded-xl bg-red-50 p-2.5 text-red-600"><Trash size={16}/></button></div></header><div className="space-y-3 p-5">{(ticket.messages || []).map((message) => <div key={message.id} className={`flex ${message.user_role === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.user_role === "admin" ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}><p className="mb-1 text-[10px] font-bold uppercase opacity-50">{message.user_name || (message.user_role === "admin" ? "Administration" : ticket.user_name)}</p><p className="whitespace-pre-wrap">{message.message}</p><time className="mt-2 block text-[10px] opacity-50">{new Date(message.created_at).toLocaleString("fr")}</time></div></div>)}{ticket.status !== "closed" && <form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; await api.post(`/support/${ticket.id}/messages`, { message: new FormData(form).get("message") }); form.reset(); await load(); }} className="mt-4 flex gap-2 border-t pt-4"><input className="input" name="message" required placeholder="Écrire une réponse…" /><button className="btn-dark">Envoyer</button></form>}</div></article>) : <EmptyAdmin text="Aucune conversation support." />}</div></section>}
    {moderationSection === "reports" && <section className="mt-6">
      <div className="flex items-center justify-between"><div><h3 className="text-xl font-bold">Signalements</h3><p className="mt-1 text-sm text-neutral-500">Examinez la cible avant de supprimer un contenu ou de bloquer son auteur.</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold">{reports.length}</span></div>
      <AdminSectionTabs value={reportFilter} onChange={setReportFilter} items={[
        ["all", "Tous", reports.length],
        ["comment", "Commentaires", reports.filter((item) => item.target_type === "comment").length],
        ["user", "Utilisateurs", reports.filter((item) => item.target_type === "user").length],
        ["summary", "Résumés", reports.filter((item) => item.target_type === "summary").length],
      ]} />
      <div className="mt-5 space-y-4">{filteredReports.length ? filteredReports.map((report) => <ReportReviewCard key={report.id} report={report} onAction={(action) => setPendingAction({ report, action })} onMessage={async (event) => { event.preventDefault(); const form = event.currentTarget; await api.post(`/reports/${report.id}/messages`, { message: new FormData(form).get("message") }); form.reset(); await load(); }} onReviewed={async (event) => { event.preventDefault(); try { const form = event.currentTarget; const reply = new FormData(form).get("reply"); setNotice((await api.put(`/admin/reports/${report.id}`, { reply, status: "reviewed" })).data.message); await load(); } catch (err) { setError(err.message); } }} />) : <div className="rounded-3xl border-2 border-dashed p-10 text-center text-sm text-neutral-500">Aucun signalement dans cette catégorie.</div>}</div>
    </section>}
    <ConfirmDialog open={Boolean(pendingAction)} title={`${actionLabel} ?`} message={pendingAction?.action === "dismiss_report" ? "Aucune sanction ne sera appliquée. Le signalement sera conservé dans l’historique avec le statut « Rejeté »." : pendingAction?.action === "block_user" ? "Le compte ne pourra plus se connecter ni apparaître publiquement. Le signalement sera marqué comme examiné." : "Le contenu sera définitivement supprimé et le signalement sera marqué comme examiné."} confirmLabel={busy ? "Traitement…" : actionLabel} danger={pendingAction?.action !== "dismiss_report"} onCancel={() => !busy && setPendingAction(null)} onConfirm={moderate} />
    <ConfirmDialog open={Boolean(pendingTicketDelete)} title="Supprimer cet historique support ?" message="La conversation et tous ses messages seront définitivement supprimés." confirmLabel="Supprimer" danger onCancel={() => setPendingTicketDelete(null)} onConfirm={async () => { await api.delete(`/admin/support/${pendingTicketDelete.id}`); setPendingTicketDelete(null); await load(); }} />
  </div>;
}

function ReportReviewCard({ report, onAction, onReviewed, onMessage }) {
  const target = report.target;
  const typeLabels = { user: "Utilisateur", comment: "Commentaire", summary: "Résumé" };
  const TypeIcon = report.target_type === "user" ? UserRound : report.target_type === "comment" ? MessageCircle : FileText;
  const authorId = report.target_type === "user" ? target?.id : target?.author_id;
  return <article className={`overflow-hidden rounded-3xl border ${report.status === "pending" ? "border-amber-200" : "border-neutral-200"}`}>
    <header className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 px-5 py-4">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white shadow-sm"><TypeIcon size={18} /></span><div><p className="font-bold">{typeLabels[report.target_type]} #{report.target_id}</p><p className="text-xs text-neutral-500">Signalé par {report.reporter_name}</p></div></div>
      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${report.status === "pending" ? "bg-amber-100 text-amber-700" : report.status === "dismissed" ? "bg-neutral-200 text-neutral-600" : "bg-emerald-100 text-emerald-700"}`}>{report.status === "pending" ? "À examiner" : report.status === "reviewed" ? "Examiné" : "Rejeté"}</span>
    </header>
    <div className="p-5">
      <div className="rounded-2xl bg-red-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-red-500">Motif du signalement</p><p className="mt-2 text-sm leading-6 text-red-900">{report.reason}</p></div>

      {target ? <div className="mt-4 rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">{target.author_avatar ? <img src={assetUrl(target.author_avatar)} className="size-11 rounded-xl object-cover" alt="" /> : <span className="grid size-11 place-items-center rounded-xl bg-neutral-100"><UserRound size={19} /></span>}<div><p className="font-bold">{target.author_name}</p><p className="text-xs text-neutral-400">{target.author_email}{target.is_blocked ? " · Compte bloqué" : ""}</p></div></div>
          <div className="flex flex-wrap gap-2">{authorId && <Link to={`/users/${authorId}`} className="btn-light px-4 py-2"><Eye size={15} />Profil</Link>}{target.book_id && <Link to={`/books/${target.book_id}`} className="btn-light px-4 py-2"><BookOpen size={15} />{target.book_title || "Livre"}</Link>}</div>
        </div>
        {target.content && <div className="mt-4 rounded-xl bg-neutral-100 p-4"><p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Contenu signalé</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{target.content}</p></div>}
      </div> : <div className="mt-4 rounded-2xl bg-neutral-100 p-4 text-sm text-neutral-500">La cible n’existe plus ou a déjà été supprimée.</div>}

      {report.admin_reply && <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm"><strong>Décision précédente :</strong> {report.admin_reply}</div>}
      {report.messages?.length > 0 && <div className="mt-4 space-y-2 rounded-2xl border p-4"><p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Historique des messages</p>{report.messages.map((message) => <div key={message.id} className={`flex ${message.user_role === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${message.user_role === "admin" ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}><p>{message.message}</p><time className="mt-1 block text-[10px] opacity-50">{new Date(message.created_at).toLocaleString("fr")}</time></div></div>)}</div>}
      <form onSubmit={onMessage} className="mt-4 flex gap-2"><input className="input" name="message" required placeholder="Laisser un message sur ce signalement…" /><button className="btn-light shrink-0">Envoyer</button></form>

      <div className="mt-5 flex flex-wrap gap-2">
        {target && report.target_type !== "user" && <button onClick={() => onAction("delete_target")} className="btn bg-red-600 text-white hover:bg-red-700"><Trash size={16} />Supprimer {report.target_type === "summary" ? "le résumé" : "le commentaire"}</button>}
        {target && authorId && !target.is_blocked && <button onClick={() => onAction("block_user")} className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"><Ban size={16} />Bloquer l’utilisateur</button>}
        {report.status === "pending" && <button onClick={() => onAction("dismiss_report")} className="btn border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 size={16} />Aucun problème — faux signalement</button>}
      </div>

      {report.status === "pending" && <form onSubmit={onReviewed} className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row"><input className="input" name="reply" required placeholder="Décision ou réponse envoyée à la personne…" /><button className="btn-dark shrink-0"><CheckCircle2 size={16} />Classer sans sanction</button></form>}
    </div>
  </article>;
}

function AdminPageHeader({ eyebrow, title, text, actions }) {
  return <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-neutral-400">{eyebrow}</p><h1 className="display mt-2 text-4xl sm:text-5xl">{title}</h1>{text && <p className="mt-3 leading-7 text-neutral-500">{text}</p>}</div>{actions && <div className="shrink-0">{actions}</div>}</header>;
}

function AdminSectionTabs({ value, onChange, items }) {
  return <nav className="mt-7 overflow-x-auto rounded-2xl border bg-neutral-50 p-2"><div className="flex min-w-max gap-1">{items.map(([id, label, count]) => <button key={id} onClick={() => onChange(id)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${value === id ? "bg-neutral-950 text-white shadow-md" : "text-neutral-500 hover:bg-white hover:text-neutral-950"}`}>{label}<span className={`rounded-full px-2 py-0.5 text-[10px] ${value === id ? "bg-white/15" : "bg-white"}`}>{count}</span></button>)}</div></nav>;
}

function MetricBadge({ value, label, danger = false }) {
  return <div className={`rounded-2xl px-4 py-3 ${danger ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-950"}`}><div className="flex items-center gap-2">{danger && <AlertTriangle size={15} />}<strong className="text-xl">{value}</strong></div><p className="text-[11px] text-neutral-500">{label}</p></div>;
}

function EmptyAdmin({ text }) {
  return <div className="grid min-h-32 place-items-center rounded-2xl border-2 border-dashed p-6 text-center text-sm text-neutral-400">{text}</div>;
}
