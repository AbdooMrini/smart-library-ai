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
  ThumbsUp,
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
        <button onClick={() => openActivity(user)} className="group flex min-w-0 items-center gap-4 text-left">{user.avatar_url ? <img src={assetUrl(user.avatar_url)} className="size-12 shrink-0 rounded-2xl object-cover" alt="" /> : <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-neutral-100 font-bold">{index+1}</span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-bold">{user.name}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${user.role === "admin" ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}>{user.role === "admin" ? "Admin" : "Lecteur"}</span>{user.is_blocked && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-700">Bloqué</span>}</div><p className="mt-1 truncate text-xs text-neutral-500">{user.email} · {user.preferred_language?.toUpperCase()}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400"><span><strong className="text-neutral-700">{user.weekly_score}</strong> pts semaine</span><span><strong className="text-neutral-700">{user.score}</strong> pts total</span><span><strong className="text-neutral-700">{user.comment_count + user.rating_count + user.quiz_count}</strong> activités</span></div></div><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neutral-100 transition group-hover:bg-neutral-950 group-hover:text-white">{selected === user.id ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</span></button>
        <div className="flex flex-wrap gap-2"><Link to={`/users/${user.id}`} className="rounded-xl border p-2.5 hover:bg-neutral-100" title="Voir le profil public"><Eye size={16} /></Link><button onClick={() => setEdit({ ...user, password: "" })} className="rounded-xl border p-2.5 hover:bg-neutral-100" title="Modifier"><Edit3 size={16} /></button><button onClick={() => block(user)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${user.is_blocked ? "bg-emerald-50 text-emerald-700" : "hover:bg-neutral-100"}`}>{user.is_blocked ? "Débloquer" : "Bloquer"}</button><button onClick={() => setPendingDelete(user)} className="rounded-xl bg-red-50 p-2.5 text-red-600 hover:bg-red-100" title="Supprimer"><Trash size={16} /></button></div>
      </div>
      {selected === user.id && <div className="border-t bg-neutral-50 p-4 sm:p-6">{!activity ? <Loader label="Chargement de l’activité…" /> : <UserActivityPanel activity={activity} user={user} />}</div>}
    </div>)}</div>}

      {edit && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={() => setEdit(null)}><form onSubmit={save} onMouseDown={(event) => event.stopPropagation()} className="card w-full max-w-lg p-7"><h3 className="display text-3xl">Modifier l’utilisateur</h3><div className="mt-6 grid gap-3"><input className="input" required value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} placeholder="Nom" /><input className="input" type="email" required value={edit.email} onChange={(event) => setEdit({ ...edit, email: event.target.value })} /><select className="input" value={edit.role} onChange={(event) => setEdit({ ...edit, role: event.target.value })}><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select><select className="input" value={edit.preferred_language || "fr"} onChange={(event) => setEdit({ ...edit, preferred_language: event.target.value })}><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select><div className="grid grid-cols-2 gap-3"><input className="input" type="number" min="0" value={edit.score} onChange={(event) => setEdit({ ...edit, score: event.target.value })} placeholder="Score total" /><input className="input" type="number" min="0" value={edit.weekly_score} onChange={(event) => setEdit({ ...edit, weekly_score: event.target.value })} placeholder="Score semaine" /></div><input className="input" type="password" minLength={6} value={edit.password} onChange={(event) => setEdit({ ...edit, password: event.target.value })} placeholder="Nouveau mot de passe (facultatif)" /></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEdit(null)} className="btn-light">Annuler</button><button className="btn-dark"><Save size={16} />Enregistrer</button></div></form></div>}
      <ConfirmDialog open={Boolean(pendingDelete)} title="Supprimer cet utilisateur ?" message={`${pendingDelete?.name || "Ce compte"} et toutes ses données associées seront définitivement supprimés.`} confirmLabel="Supprimer" danger onCancel={() => setPendingDelete(null)} onConfirm={() => remove(pendingDelete.id)} />
  </div>;
}

function UserActivityPanel({ activity, user }) {
  const sections = [
    { id: "comments", label: "Commentaires", icon: MessageCircle, items: activity.comments || [] },
    { id: "ratings", label: "Notes", icon: Star, items: activity.ratings || [] },
    { id: "quizzes", label: "QCM", icon: WandSparkles, items: activity.quizzes || [] },
    { id: "wishes", label: "Souhaits", icon: BookOpen, items: activity.wishes || [] },
    { id: "history", label: "Classement", icon: BarChart3, items: activity.history || [] },
  ];
  const [section, setSection] = useState("comments");
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setSection("comments"); setExpanded(false); }, [user.id]);
  const current = sections.find((item) => item.id === section) || sections[0];
  const visibleItems = expanded ? current.items : current.items.slice(0, 3);
  const totalActivity = sections.slice(0, 4).reduce((total, item) => total + item.items.length, 0);

  return <div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UserMetric value={totalActivity} label="Activités enregistrées" icon={BarChart3} />
      <UserMetric value={activity.comments?.length || 0} label="Commentaires" icon={MessageCircle} />
      <UserMetric value={activity.ratings?.length || 0} label="Notes données" icon={Star} />
      <UserMetric value={activity.quizzes?.length || 0} label="QCM terminés" icon={WandSparkles} />
    </div>

    <div className="mt-5 overflow-hidden rounded-3xl border bg-white">
      <div className="border-b p-3">
        <nav className="flex gap-2 overflow-x-auto">{sections.map(({ id,label,icon: Icon,items }) => <button key={id} onClick={() => { setSection(id); setExpanded(false); }} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${section === id ? "bg-neutral-950 text-white shadow" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}><Icon size={16}/>{label}<span className={`rounded-full px-2 py-0.5 text-[10px] ${section === id ? "bg-white/15" : "bg-white"}`}>{items.length}</span></button>)}</nav>
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-lg font-bold">{current.label}</h4><p className="text-xs text-neutral-400">{current.items.length} élément{current.items.length > 1 ? "s" : ""} trouvé{current.items.length > 1 ? "s" : ""}</p></div><Link to={`/users/${user.id}`} className="btn-light px-4 py-2"><Eye size={15}/>Voir le profil public</Link></div>
        {visibleItems.length ? <div className="grid gap-3 lg:grid-cols-2">{visibleItems.map((item,index) => <UserActivityItem key={item.id || item.week_start || `${section}-${index}`} type={section} item={item} />)}</div> : <EmptyAdmin text={`Aucune donnée dans « ${current.label} ».`} />}
        {current.items.length > 3 && <button onClick={() => setExpanded((value) => !value)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border bg-neutral-50 px-4 py-3 text-sm font-bold hover:bg-neutral-100">{expanded ? <ChevronUp size={17}/> : <ChevronDown size={17}/>} {expanded ? "Afficher moins" : `Afficher les ${current.items.length - 3} autres`}</button>}
      </div>
    </div>
  </div>;
}

function UserMetric({ value, label, icon: Icon }) {
  return <div className="flex items-center gap-3 rounded-2xl border bg-white p-4"><span className="grid size-10 place-items-center rounded-xl bg-neutral-100"><Icon size={17}/></span><div><strong className="text-2xl">{value}</strong><p className="text-xs text-neutral-400">{label}</p></div></div>;
}

function UserActivityItem({ type, item }) {
  if (type === "comments") return <article className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><Link to={`/books/${item.book_id}`} className="font-bold hover:underline">{item.book_title}</Link><MessageCircle size={16} className="shrink-0 text-neutral-300"/></div><p className="mt-3 whitespace-pre-wrap rounded-xl bg-neutral-100 p-3 text-sm leading-6 text-neutral-700">{item.text}</p><time className="mt-3 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></article>;
  if (type === "ratings") return <Link to={`/books/${item.book_id}`} className="rounded-2xl border p-4 transition hover:border-amber-300 hover:bg-amber-50/40"><div className="flex items-start justify-between gap-3"><strong>{item.book_title}</strong><span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800"><Star size={12} fill="currentColor"/>{item.value}/5</span></div>{item.created_at && <time className="mt-4 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time>}</Link>;
  if (type === "quizzes") return <Link to={`/books/${item.book_id}`} className="rounded-2xl border p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"><strong>{item.book_title}</strong><div className="mt-4 flex items-end justify-between"><span><strong className="text-3xl">{item.score}%</strong><small className="ml-2 text-neutral-400">résultat</small></span><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">+{item.points} pts</span></div><time className="mt-4 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></Link>;
  if (type === "wishes") return <article className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><strong>{item.book_title}</strong><p className="mt-1 text-xs text-neutral-500">{item.author || "Auteur non précisé"}</p></div><WishStatus status={item.status}/></div>{item.message && <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm leading-6">{item.message}</p>}<time className="mt-3 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></article>;
  return <article className="rounded-2xl border p-4"><div className="flex items-center justify-between"><div><strong className="text-3xl">#{item.rank_position}</strong><p className="mt-1 text-xs text-neutral-400">Position hebdomadaire</p></div><span className="rounded-xl bg-neutral-950 px-4 py-2 font-bold text-white">{item.weekly_score} pts</span></div><p className="mt-4 border-t pt-3 text-xs text-neutral-400">{new Date(item.week_start).toLocaleDateString("fr")} → {new Date(item.week_end).toLocaleDateString("fr")}</p></article>;
}

export function AdminContent() {
  const [comments, setComments] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [books, setBooks] = useState([]);
  const [bookSearch, setBookSearch] = useState("");
  const [wishFilter, setWishFilter] = useState("pending");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
  const filteredWishes = useMemo(() => wishes.filter((wish) => wishFilter === "all" || wish.status === wishFilter), [wishes, wishFilter]);
  const averageRating = ratings.length ? ratings.reduce((total, rating) => total + Number(rating.value || 0), 0) / ratings.length : 0;
  const pendingWishes = wishes.filter((wish) => wish.status === "pending").length;
  const acceptedWishes = wishes.filter((wish) => wish.status === "accepted").length;
  const removeBook = async (id) => { try { await api.delete(`/books/${id}`); setPendingBookDelete(null); await load(); } catch (err) { setError(err.message); } };
  const updateWish = async (wish, status) => {
    try {
      const { data } = await api.put(`/admin/wishes/${wish.id}`, { status });
      setWishes((current) => current.map((item) => item.id === wish.id ? { ...item, status } : item));
      setNotice(data.message);
    } catch (err) { setError(err.message); }
  };
  if (loading) return <Loader />;
  return <div>
    <AdminPageHeader eyebrow="Bibliothèque" title="Contenu & catalogue" text="Contrôlez le catalogue et toute l’activité éditoriale depuis un espace organisé." />
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <button onClick={() => setNotice("")} className="mt-4 flex w-full items-center gap-2 rounded-xl bg-emerald-50 p-3 text-left text-sm text-emerald-700"><CheckCircle2 size={17} />{notice}</button>}

    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMiniStat icon={BookOpen} value={books.length} label="Livres chargés" detail="Catalogue disponible" tone="bg-violet-50 text-violet-700" />
      <AdminMiniStat icon={Star} value={averageRating.toFixed(1)} label="Note moyenne" detail={`${ratings.length} note${ratings.length > 1 ? "s" : ""}`} tone="bg-amber-50 text-amber-700" />
      <AdminMiniStat icon={MessageCircle} value={comments.length} label="Commentaires" detail="Activité des lecteurs" tone="bg-blue-50 text-blue-700" />
      <AdminMiniStat icon={Clock3} value={pendingWishes} label="Souhaits à traiter" detail={`${acceptedWishes} accepté${acceptedWishes > 1 ? "s" : ""}`} tone="bg-emerald-50 text-emerald-700" />
    </section>

    <AdminSectionTabs value={contentSection} onChange={setContentSection} items={[["books", "Livres & avis", books.length], ["wishes", "Souhaits", wishes.length]]} />
    {contentSection === "books" && <section className="mt-6 overflow-hidden rounded-3xl border">
      <div className="border-b bg-neutral-50 p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={19} />Livres enregistrés</h3><p className="mt-1 text-sm text-neutral-500">Recherchez, ouvrez ou retirez rapidement un ouvrage.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">{filteredBooks.length} résultat{filteredBooks.length > 1 ? "s" : ""}</span></div><label className="relative mt-4 block"><Search className="absolute left-4 top-3.5 text-neutral-400" size={17} /><input className="input bg-white pl-11" value={bookSearch} onChange={(event) => setBookSearch(event.target.value)} placeholder="Titre, auteur ou langue…" /></label></div>
      <div className="max-h-[50rem] divide-y overflow-y-auto">{filteredBooks.length ? filteredBooks.map((book) => <AdminBookCommunityRow key={book.id} book={book} onDelete={() => setPendingBookDelete(book)} />) : <div className="p-6"><State title="Aucun livre trouvé" /></div>}</div>
    </section>}

    {contentSection === "wishes" && <section className="mt-6 overflow-hidden rounded-3xl border">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b bg-neutral-50 p-5 sm:p-6"><div><h3 className="text-lg font-bold">Souhaits de livres</h3><p className="mt-1 text-sm text-neutral-500">Traitez les demandes puis retrouvez-les dans leur statut.</p></div><div className="flex flex-wrap gap-2">{[["pending","À traiter"],["accepted","Acceptés"],["refused","Refusés"],["all","Tous"]].map(([id,label]) => <button key={id} onClick={() => setWishFilter(id)} className={`rounded-xl px-3 py-2 text-xs font-bold ${wishFilter === id ? "bg-neutral-950 text-white" : "border bg-white text-neutral-600"}`}>{label} <span className="ml-1 opacity-60">{id === "all" ? wishes.length : wishes.filter((item) => item.status === id).length}</span></button>)}</div></div>
      <div className="grid gap-4 p-5 lg:grid-cols-2">{filteredWishes.length ? filteredWishes.map((wish) => <article key={wish.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-lg font-bold">{wish.book_title}</p><p className="mt-1 text-sm text-neutral-500">{wish.author || "Auteur non précisé"}</p></div><WishStatus status={wish.status} /></div><div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-xs"><Link to={`/users/${wish.user_id}`} className="font-bold hover:underline">{wish.user_name}</Link><span className="text-neutral-400">{wish.user_weekly_score} pts semaine · {wish.user_score} total</span></div>{wish.message && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-neutral-100 p-4 text-sm leading-6 text-neutral-700">{wish.message}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3"><time className="text-[10px] text-neutral-400">{new Date(wish.created_at).toLocaleString("fr")}</time><div className="flex gap-2">{wish.status !== "accepted" && <button onClick={() => updateWish(wish, "accepted")} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">Accepter</button>}{wish.status !== "refused" && <button onClick={() => updateWish(wish, "refused")} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100">Refuser</button>}{wish.status !== "pending" && <button onClick={() => updateWish(wish, "pending")} className="rounded-xl border px-3 py-2 text-xs font-bold hover:bg-neutral-50">Remettre en attente</button>}</div></div></article>) : <div className="lg:col-span-2"><EmptyAdmin text="Aucun souhait dans cette catégorie." /></div>}</div>
    </section>}
    <ConfirmDialog open={Boolean(pendingBookDelete)} title="Supprimer ce livre ?" message={`« ${pendingBookDelete?.title || "Ce livre"} » et toutes ses données associées seront supprimés.`} confirmLabel="Supprimer" danger onCancel={() => setPendingBookDelete(null)} onConfirm={() => removeBook(pendingBookDelete.id)} />
  </div>;
}

function AdminBookCommunityRow({ book, onDelete }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({ ratings: false, comments: false, summaries: false });

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || data) return;
    try {
      setLoading(true);
      setError("");
      setData((await api.get(`/admin/books/${book.id}/community`)).data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const bestComment = data?.comments?.[0];
  const bestSummary = data?.summaries?.[0];
  return <article className="transition hover:bg-neutral-50">
    <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
      <button onClick={toggle} className="group min-w-0 text-left"><span className="block truncate font-bold group-hover:underline">{book.title}</span><span className="mt-1 block truncate text-xs text-neutral-400">{book.authors?.join(", ") || "Auteur inconnu"} · {book.language?.toUpperCase()}</span></button>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"><Star size={13} fill="currentColor" />{Number(book.average_rating).toFixed(1)} <span className="font-normal">({book.rating_count})</span></span>
        {data && <><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{data.stats.comment_count} commentaires</span><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{data.stats.summary_count} résumés</span></>}
        <button onClick={toggle} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-bold hover:bg-neutral-100">{open ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {open ? "Masquer" : "Afficher les détails"}</button>
        <Link to={`/books/${book.id}`} className="rounded-xl border bg-white p-2 text-neutral-500 hover:bg-neutral-100" title="Voir le livre"><Eye size={16} /></Link>
        <button onClick={onDelete} className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100" title="Supprimer"><Trash size={16} /></button>
      </div>
    </div>

    {open && <div className="border-t bg-[#fafaf8] p-4 sm:p-6">
      {loading ? <Loader label="Chargement des avis et résumés…" /> : error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : data && <>
        <div className="grid gap-4 xl:grid-cols-3">
          <BookHighlight icon={Star} tone="bg-amber-50 text-amber-700" title="Notes du livre" value={`${Number(data.stats.average_rating).toFixed(1)}/5`} subtitle={`${data.stats.rating_count} lecteur${data.stats.rating_count > 1 ? "s" : ""} ont noté ce livre`}>
            <div className="mt-4 flex gap-1">{[1,2,3,4,5].map((value) => <Star key={value} size={17} className={value <= Math.round(data.stats.average_rating) ? "fill-amber-400 text-amber-400" : "text-neutral-200"} />)}</div>
          </BookHighlight>
          <BookHighlight icon={ThumbsUp} tone="bg-blue-50 text-blue-700" title="Meilleur commentaire" value={bestComment ? `${bestComment.like_count} like${bestComment.like_count > 1 ? "s" : ""}` : "Aucun"} subtitle={bestComment ? `Par ${bestComment.user_name}` : "Aucun commentaire publié"}>
            {bestComment && <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">“{bestComment.text}”</p>}
          </BookHighlight>
          <BookHighlight icon={FileText} tone="bg-violet-50 text-violet-700" title="Meilleur résumé" value={bestSummary ? `${bestSummary.like_count} like${bestSummary.like_count > 1 ? "s" : ""}` : "Aucun"} subtitle={bestSummary ? `Par ${bestSummary.user_name} · ${bestSummary.view_count} vues` : "Aucun résumé publié"}>
            {bestSummary && <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-600">{bestSummary.text}</p>}
          </BookHighlight>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <BookDetailCollection title="Toutes les notes" icon={Star} items={data.ratings} expanded={expanded.ratings} onToggle={() => setExpanded((current) => ({ ...current, ratings: !current.ratings }))} empty="Aucune note">
            {(rating) => <OwnerDetail key={rating.id} owner={rating} date={rating.created_at} badge={<span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800"><Star size={12} fill="currentColor"/>{rating.value}/5</span>} />}
          </BookDetailCollection>
          <BookDetailCollection title="Tous les commentaires" icon={MessageCircle} items={data.comments} expanded={expanded.comments} onToggle={() => setExpanded((current) => ({ ...current, comments: !current.comments }))} empty="Aucun commentaire">
            {(comment) => <OwnerDetail key={comment.id} owner={comment} date={comment.created_at} badge={<span className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"><ThumbsUp size={12}/>{comment.like_count}</span>}><p className="mt-3 whitespace-pre-wrap rounded-xl bg-neutral-100 p-3 text-sm leading-6">{comment.text}</p></OwnerDetail>}
          </BookDetailCollection>
          <BookDetailCollection title="Tous les résumés" icon={FileText} items={data.summaries} expanded={expanded.summaries} onToggle={() => setExpanded((current) => ({ ...current, summaries: !current.summaries }))} empty="Aucun résumé">
            {(summary) => <OwnerDetail key={summary.id} owner={summary} date={summary.updated_at || summary.created_at} badge={<span className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700"><ThumbsUp size={12}/>{summary.like_count}</span>}><p className="mt-3 line-clamp-5 whitespace-pre-wrap rounded-xl bg-neutral-100 p-3 text-sm leading-6">{summary.text}</p><div className="mt-2 flex gap-3 text-[10px] text-neutral-400"><span>{summary.view_count} vues</span><span>{summary.comment_count} commentaires</span><span>{summary.language?.toUpperCase()}</span></div></OwnerDetail>}
          </BookDetailCollection>
        </div>
      </>}
    </div>}
  </article>;
}

function BookHighlight({ icon: Icon, tone, title, value, subtitle, children }) {
  return <section className="rounded-2xl border bg-white p-5"><div className="flex items-start justify-between gap-3"><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon size={18}/></span><strong className="text-lg">{value}</strong></div><h4 className="mt-4 font-bold">{title}</h4><p className="mt-1 text-xs text-neutral-400">{subtitle}</p>{children}</section>;
}

function BookDetailCollection({ title, icon: Icon, items, expanded, onToggle, empty, children }) {
  const visible = expanded ? items : items.slice(0, 3);
  return <section className="overflow-hidden rounded-2xl border bg-white"><header className="flex items-center justify-between border-b p-4"><h4 className="flex items-center gap-2 font-bold"><Icon size={16}/>{title}</h4><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold">{items.length}</span></header><div className="space-y-3 p-4">{visible.length ? visible.map(children) : <EmptyAdmin text={empty} />}{items.length > 3 && <button onClick={onToggle} className="flex w-full items-center justify-center gap-2 rounded-xl border bg-neutral-50 px-3 py-2.5 text-xs font-bold hover:bg-neutral-100">{expanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {expanded ? "Afficher moins" : `Afficher les ${items.length - 3} autres`}</button>}</div></section>;
}

function OwnerDetail({ owner, date, badge, children }) {
  return <article className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{owner.user_avatar ? <img src={assetUrl(owner.user_avatar)} className="size-9 rounded-xl object-cover" alt="" /> : <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neutral-100"><UserRound size={15}/></span>}<div className="min-w-0"><Link to={`/users/${owner.user_id}`} className="block truncate text-sm font-bold hover:underline">{owner.user_name}</Link><p className="truncate text-[10px] text-neutral-400">{owner.user_email}</p></div></div>{badge}</div>{children}{date && <time className="mt-3 block text-[10px] text-neutral-400">{new Date(date).toLocaleString("fr")}</time>}</article>;
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
  const [supportView, setSupportView] = useState("active");
  const [reportView, setReportView] = useState("active");
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
  const activeTickets = tickets.filter((ticket) => ticket.status !== "closed");
  const archivedTickets = tickets.filter((ticket) => ticket.status === "closed");
  const visibleTickets = supportView === "active" ? activeTickets : archivedTickets;
  const activeReports = reports.filter((report) => report.status === "pending");
  const archivedReports = reports.filter((report) => report.status !== "pending");
  const reportsByView = reportView === "active" ? activeReports : archivedReports;
  const filteredReports = reportFilter === "all" ? reportsByView : reportsByView.filter((report) => report.target_type === reportFilter);
  const actionLabel = pendingAction?.action === "dismiss_report"
    ? "Classer comme faux signalement"
    : pendingAction?.action === "block_user"
      ? "Bloquer l’utilisateur"
      : pendingAction?.report.target_type === "summary"
        ? "Supprimer le résumé"
        : "Supprimer le commentaire";
  return <div><AdminPageHeader eyebrow="Sécurité" title="Support & signalements" text="Une file claire pour les dossiers actifs, avec un historique séparé pour tout ce qui est terminé." />{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <button onClick={() => setNotice("")} className="mt-4 flex w-full items-center gap-2 rounded-xl bg-emerald-50 p-3 text-left text-sm text-emerald-700"><CheckCircle2 size={17} />{notice}</button>}
    <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMiniStat icon={LifeBuoy} value={activeTickets.length} label="Supports actifs" detail={`${tickets.filter((item) => item.status === "open").length} en attente de réponse`} tone="bg-blue-50 text-blue-700" />
      <AdminMiniStat icon={CheckCircle2} value={archivedTickets.length} label="Supports fermés" detail="Conservés dans les archives" tone="bg-emerald-50 text-emerald-700" />
      <AdminMiniStat icon={AlertTriangle} value={activeReports.length} label="À examiner" detail="Signalements prioritaires" tone="bg-red-50 text-red-700" />
      <AdminMiniStat icon={Shield} value={archivedReports.length} label="Signalements traités" detail={`${reports.filter((item) => item.status === "dismissed").length} classés sans sanction`} tone="bg-violet-50 text-violet-700" />
    </section>
    <AdminSectionTabs value={moderationSection} onChange={setModerationSection} items={[["support", "Support", activeTickets.length], ["reports", "Signalements", activeReports.length]]} />
    {moderationSection === "support" && <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-bold">Conversations support</h3><p className="mt-1 text-sm text-neutral-500">Fermer une conversation la masque de la file active sans effacer son historique.</p></div><div className="flex rounded-xl border bg-neutral-50 p-1">{[["active","À traiter",activeTickets.length],["archive","Archives",archivedTickets.length]].map(([id,label,count]) => <button key={id} onClick={() => setSupportView(id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${supportView === id ? "bg-neutral-950 text-white shadow" : "text-neutral-500"}`}>{label} <span className="ml-1 opacity-60">{count}</span></button>)}</div></div>
      <div className="mt-4 space-y-4">{visibleTickets.length ? visibleTickets.map((ticket) => <article key={ticket.id} className="overflow-hidden rounded-3xl border">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 p-5"><div><div className="flex flex-wrap items-center gap-2"><strong>{ticket.subject}</strong><SupportStatus status={ticket.status} /></div><p className="mt-1 text-xs text-neutral-500">{ticket.user_name} · {ticket.user_email} · créé le {new Date(ticket.created_at).toLocaleString("fr")}</p><p className="mt-1 text-[10px] text-neutral-400">Dernière activité : {new Date(ticket.updated_at).toLocaleString("fr")} · {ticket.messages?.length || 0} message(s)</p></div><div className="flex flex-wrap items-center gap-2">{ticket.status === "closed" ? <button onClick={async () => { await api.put(`/admin/support/${ticket.id}/status`, { status: "open" }); setNotice("Conversation replacée dans la file active."); await load(); }} className="btn-light px-4 py-2"><RefreshCw size={15}/>Rouvrir</button> : <button onClick={async () => { await api.put(`/admin/support/${ticket.id}/status`, { status: "closed" }); setNotice("Conversation fermée et déplacée dans les archives."); await load(); }} className="btn-dark px-4 py-2"><CheckCircle2 size={15}/>Fermer et masquer</button>}<button onClick={() => setPendingTicketDelete(ticket)} className="rounded-xl bg-red-50 p-2.5 text-red-600" title="Supprimer définitivement"><Trash size={16}/></button></div></header>
        <div className="space-y-3 p-5">{(ticket.messages || []).map((message) => <div key={message.id} className={`flex ${message.user_role === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.user_role === "admin" ? "bg-neutral-950 text-white" : "bg-neutral-100"}`}><p className="mb-1 text-[10px] font-bold uppercase opacity-50">{message.user_name || (message.user_role === "admin" ? "Administration" : ticket.user_name)}</p><p className="whitespace-pre-wrap">{message.message}</p><time className="mt-2 block text-[10px] opacity-50">{new Date(message.created_at).toLocaleString("fr")}</time></div></div>)}{ticket.status !== "closed" && <form onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; await api.post(`/support/${ticket.id}/messages`, { message: new FormData(form).get("message") }); form.reset(); await load(); }} className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row"><input className="input" name="message" required placeholder="Écrire une réponse…" /><button className="btn-dark shrink-0">Envoyer</button></form>}</div>
      </article>) : <EmptyAdmin text={supportView === "active" ? "Aucune conversation à traiter." : "Aucune conversation archivée."} />}</div>
    </section>}
    {moderationSection === "reports" && <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-bold">Signalements</h3><p className="mt-1 text-sm text-neutral-500">Après décision, le dossier quitte automatiquement la file active et reste dans les archives.</p></div><div className="flex rounded-xl border bg-neutral-50 p-1">{[["active","À examiner",activeReports.length],["archive","Archives",archivedReports.length]].map(([id,label,count]) => <button key={id} onClick={() => setReportView(id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${reportView === id ? "bg-neutral-950 text-white shadow" : "text-neutral-500"}`}>{label} <span className="ml-1 opacity-60">{count}</span></button>)}</div></div>
      <AdminSectionTabs value={reportFilter} onChange={setReportFilter} items={[
        ["all", "Tous", reportsByView.length],
        ["comment", "Commentaires", reportsByView.filter((item) => item.target_type === "comment").length],
        ["user", "Utilisateurs", reportsByView.filter((item) => item.target_type === "user").length],
        ["summary", "Résumés", reportsByView.filter((item) => item.target_type === "summary").length],
      ]} />
      <div className="mt-5 space-y-4">{filteredReports.length ? filteredReports.map((report) => <ReportReviewCard key={report.id} report={report} onAction={(action) => setPendingAction({ report, action })} onMessage={async (event) => { event.preventDefault(); const form = event.currentTarget; await api.post(`/reports/${report.id}/messages`, { message: new FormData(form).get("message") }); form.reset(); await load(); }} onReviewed={async (event) => { event.preventDefault(); try { const form = event.currentTarget; const reply = new FormData(form).get("reply"); setNotice((await api.put(`/admin/reports/${report.id}`, { reply, status: "reviewed" })).data.message); await load(); } catch (err) { setError(err.message); } }} />) : <div className="rounded-3xl border-2 border-dashed p-10 text-center text-sm text-neutral-500">{reportView === "active" ? "Aucun signalement à examiner dans cette catégorie." : "Aucun signalement archivé dans cette catégorie."}</div>}</div>
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
      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${report.status === "pending" ? "bg-amber-100 text-amber-700" : report.status === "dismissed" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>{report.status === "pending" ? "À examiner" : report.status === "reviewed" ? "Examiné" : "Faux signalement"}</span>
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
      {report.status === "pending" && <form onSubmit={onMessage} className="mt-4 flex gap-2"><input className="input" name="message" required placeholder="Laisser un message sur ce signalement…" /><button className="btn-light shrink-0">Envoyer</button></form>}

      {report.status === "pending" && <div className="mt-5 flex flex-wrap gap-2">
        {target && report.target_type !== "user" && <button onClick={() => onAction("delete_target")} className="btn bg-red-600 text-white hover:bg-red-700"><Trash size={16} />Supprimer {report.target_type === "summary" ? "le résumé" : "le commentaire"}</button>}
        {target && authorId && !target.is_blocked && <button onClick={() => onAction("block_user")} className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"><Ban size={16} />Bloquer l’utilisateur</button>}
        <button onClick={() => onAction("dismiss_report")} className="btn border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"><Shield size={16} />Ne rien faire — faux signalement</button>
      </div>}

      {report.status === "pending" && <form onSubmit={onReviewed} className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row"><input className="input" name="reply" required placeholder="Décision ou réponse envoyée à la personne…" /><button className="btn-dark shrink-0"><CheckCircle2 size={16} />Marquer comme examiné</button></form>}
    </div>
  </article>;
}

function AdminPageHeader({ eyebrow, title, text, actions }) {
  return <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-neutral-400">{eyebrow}</p><h1 className="display mt-2 text-4xl sm:text-5xl">{title}</h1>{text && <p className="mt-3 leading-7 text-neutral-500">{text}</p>}</div>{actions && <div className="shrink-0">{actions}</div>}</header>;
}

function AdminSectionTabs({ value, onChange, items }) {
  return <nav className="mt-7 overflow-x-auto rounded-2xl border bg-neutral-50 p-2"><div className="flex min-w-max gap-1">{items.map(([id, label, count]) => <button key={id} onClick={() => onChange(id)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${value === id ? "bg-neutral-950 text-white shadow-md" : "text-neutral-500 hover:bg-white hover:text-neutral-950"}`}>{label}<span className={`rounded-full px-2 py-0.5 text-[10px] ${value === id ? "bg-white/15" : "bg-white"}`}>{count}</span></button>)}</div></nav>;
}

function AdminMiniStat({ icon: Icon, value, label, detail, tone }) {
  return <div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className={`grid size-11 place-items-center rounded-2xl ${tone}`}><Icon size={20} /></span><strong className="text-3xl">{value}</strong></div><p className="mt-5 font-bold">{label}</p><p className="mt-1 text-xs text-neutral-400">{detail}</p></div>;
}

function SupportStatus({ status }) {
  const style = status === "closed" ? "bg-neutral-200 text-neutral-600" : status === "answered" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  const label = status === "closed" ? "Fermé" : status === "answered" ? "Répondu" : "Ouvert";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${style}`}>{label}</span>;
}

function WishStatus({ status }) {
  const style = status === "accepted" ? "bg-emerald-100 text-emerald-700" : status === "refused" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  const label = status === "accepted" ? "Accepté" : status === "refused" ? "Refusé" : "En attente";
  return <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${style}`}>{label}</span>;
}

function MetricBadge({ value, label, danger = false }) {
  return <div className={`rounded-2xl px-4 py-3 ${danger ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-950"}`}><div className="flex items-center gap-2">{danger && <AlertTriangle size={15} />}<strong className="text-xl">{value}</strong></div><p className="text-[11px] text-neutral-500">{label}</p></div>;
}

function EmptyAdmin({ text }) {
  return <div className="grid min-h-32 place-items-center rounded-2xl border-2 border-dashed p-6 text-center text-sm text-neutral-400">{text}</div>;
}
