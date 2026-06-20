import { useEffect, useState } from "react";
import { BookOpen, Eye, Flag, Heart, MessageCircle, Radio, Trophy, User } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { BookCard, Loader, State } from "../components/UI";
import { assetUrl } from "../lib/assets";
import { useAuth } from "../context/AuthContext";
import { ReportDialog } from "../components/Dialogs";

export default function PublicProfile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [imageOpen, setImageOpen] = useState(false);
  const [error, setError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => {
    let active = true;
    setData((current) => current && current.user?.id === Number(id) ? current : null);
    setError("");
    const refreshProfile = () => api.get(`/users/${id}`, { params: { page } })
      .then((response) => { if (active) setData(response.data); })
      .catch((err) => { if (active) setError(err.message); });
    refreshProfile();
    const timer = setInterval(refreshProfile, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id, page]);
  const toggleLike = async () => {
    if (!currentUser) return;
    const { data: result } = data.is_liked ? await api.delete(`/users/${id}/like`) : await api.post(`/users/${id}/like`);
    setData((value) => ({ ...value, is_liked: result.liked, like_count: result.count }));
  };
  if (error) return <section className="container-page py-20"><State title="Profil indisponible" text={error} /></section>;
  if (!data) return <Loader />;
  const profile = data.user;
  if (!profile) return <section className="container-page py-20"><State title="Profil indisponible" text="Les informations de cet utilisateur sont incomplètes." /></section>;
  const favorites = Array.isArray(data.favorites) ? data.favorites : [];
  const comments = Array.isArray(data.comments) ? data.comments : [];
  const wishes = Array.isArray(data.wishes) ? data.wishes : [];
  const history = Array.isArray(data.history) ? data.history : [];
  const pagination = data.pagination || { page: 1, pages: 1 };
  return <section className="container-page py-10 sm:py-14">
      <div className="card overflow-hidden"><div className="relative bg-neutral-950 p-8 text-white sm:p-12"><div className="absolute right-6 top-5 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] text-neutral-300"><Radio size={11} className="text-emerald-400" />Actualisation automatique</div><div className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-center sm:pt-0">{profile.avatar_url ? <button onClick={() => setImageOpen(true)}><img src={assetUrl(profile.avatar_url)} className="size-32 rounded-[2rem] border-4 border-white/20 object-cover" alt={profile.name} /></button> : <span className="grid size-32 place-items-center rounded-[2rem] bg-white/10"><User size={48} /></span>}<div className="flex-1"><h1 className="display text-4xl sm:text-5xl">{profile.name}</h1><p className="mt-3 text-neutral-400">Membre depuis {new Date(profile.created_at).toLocaleDateString("fr")}</p><div className="mt-5 flex flex-wrap gap-4 text-sm"><span><Trophy className="inline" size={16} /> #{data.rank_position || "—"}</span><span><Heart className="inline" size={16} /> {data.like_count}</span><span><Eye className="inline" size={16} /> {data.view_count}</span></div></div>{currentUser && currentUser.id !== profile.id && <div className="flex flex-wrap gap-2"><button onClick={toggleLike} className="btn bg-white text-black"><Heart size={17} fill={data.is_liked ? "currentColor" : "none"} />{data.is_liked ? "Aimé" : "Aimer"}</button><button onClick={async () => { const result = await api.post(`/conversations/private/${profile.id}`); navigate(`/messages?conversation=${result.data.id}`); }} className="btn border border-white text-white"><MessageCircle size={17}/>Message</button><button onClick={() => setReportOpen(true)} className="btn border border-white text-white"><Flag size={17}/></button></div>}</div></div>
      <div className="grid gap-6 p-7 md:grid-cols-3"><Stat icon={BookOpen} value={data.favorite_count} label="livres favoris" /><Stat icon={MessageCircle} value={data.comment_count} label="commentaires" /><Stat icon={Trophy} value={profile.weekly_score} label="points semaine" /></div></div>
    <Section title="Livres favoris">{favorites.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{favorites.map((book) => <BookCard key={book.id} book={book} />)}</div> : null}</Section>
    <div className="grid gap-6 lg:grid-cols-3"><Section title="Commentaires">{comments.map((item) => <Link to={`/books/${item.book_id}`} key={item.id} className="block rounded-2xl bg-neutral-100 p-4 hover:bg-neutral-200"><strong>{item.book_title}</strong><p className="mt-2 text-sm leading-6">{item.text}</p><time className="mt-3 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></Link>)}</Section><Section title="Souhaits">{wishes.map((item) => <div key={item.id} className="rounded-2xl bg-neutral-100 p-4"><div className="flex items-start justify-between gap-2"><strong>{item.book_title}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.status === "accepted" ? "bg-emerald-100 text-emerald-700" : item.status === "refused" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{item.status}</span></div><p className="mt-1 text-xs text-neutral-500">{item.author || "Auteur non précisé"}</p>{item.message && <p className="mt-3 text-sm">{item.message}</p>}<time className="mt-3 block text-[10px] text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></div>)}</Section><Section title="Historique du rang">{history.map((item) => <div key={item.week_start} className="flex items-center justify-between rounded-2xl bg-neutral-100 p-4"><div><strong className="text-2xl">#{item.rank_position}</strong><p className="text-[10px] text-neutral-400">{new Date(item.week_start).toLocaleDateString("fr")}</p></div><span className="font-bold">{item.weekly_score} pts</span></div>)}</Section></div>
    {pagination.pages > 1 && <div className="mt-8 flex justify-center gap-2"><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="btn-light">Précédent</button><span className="px-4 py-3 text-sm">{pagination.page}/{pagination.pages}</span><button disabled={page === pagination.pages} onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))} className="btn-dark">Suivant</button></div>}
    {imageOpen && <div onClick={() => setImageOpen(false)} className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-6"><img src={assetUrl(profile.avatar_url)} className="max-h-full max-w-full rounded-3xl object-contain" alt={profile.name} /></div>}
    <ReportDialog open={reportOpen} targetType="user" targetId={profile.id} onClose={() => setReportOpen(false)} />
  </section>;
}
function Stat({ icon: Icon, value, label }) { return <div className="rounded-2xl bg-neutral-100 p-5"><Icon /><p className="mt-3 text-3xl font-extrabold">{value}</p><p className="text-sm text-neutral-500">{label}</p></div>; }
function Section({ title, children }) {
  const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="card mt-6 p-6"><h2 className="mb-5 text-xl font-bold">{title}</h2><div className="space-y-3">{hasContent ? children : <p className="text-sm text-neutral-500">Aucune donnée.</p>}</div></section>;
}
