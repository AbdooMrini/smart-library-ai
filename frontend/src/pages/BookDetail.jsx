import { useEffect, useState } from "react";
import { BookOpen, Bot, Download, Eye, Flag, Heart, MessageCircle, Send, Sparkles, Star, ThumbsUp, Trash2, Trophy, UserCircle, Users, Volume2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { Loader, State } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { assetUrl } from "../lib/assets";
import { ReportDialog } from "../components/Dialogs";

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const { t, language } = useLanguage();
  const [book, setBook] = useState(null);
  const [comments, setComments] = useState([]);
  const [rating, setRating] = useState({ average: 0, count: 0, user_value: null });
  const [favorite, setFavorite] = useState(false);
  const [summary, setSummary] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [translatedComments, setTranslatedComments] = useState({});
  const [quizStatus, setQuizStatus] = useState({ completed_this_week: false });
  const [commentPage, setCommentPage] = useState(1);
  const [report, setReport] = useState(null);
  const [bookRoom, setBookRoom] = useState(null);
  const [summaryAudio, setSummaryAudio] = useState(null);
  const [audioUnavailable, setAudioUnavailable] = useState("");

  const loadComments = async () => setComments((await api.get(`/books/${id}/comments`)).data);
  useEffect(() => {
    let active = true;
    setSummary(null); setSummaryAudio(null); setAudioUnavailable(""); setQuiz([]); setResult(null); setError("");
    Promise.all([
      api.get(`/books/${id}`),
      api.get(`/books/${id}/comments`),
      api.get(`/books/${id}/rating`),
      user ? api.get(`/favorites/${id}`) : Promise.resolve({ data: { is_favorite: false } }),
      user ? api.get(`/ai/books/${id}/summary`) : Promise.resolve({ data: null }),
      user ? api.get(`/books/${id}/quiz/status`) : Promise.resolve({ data: { completed_this_week: false } }),
    ]).then(async ([bookRes, commentsRes, ratingRes, favoriteRes, summaryRes, quizStatusRes]) => {
      if (!active) return;
      setBook(bookRes.data); setComments(commentsRes.data); setRating(ratingRes.data); setFavorite(favoriteRes.data.is_favorite);
      setQuizStatus(quizStatusRes.data);
      if (user) {
        if (summaryRes.data) setSummary(summaryRes.data);
        else {
          setBusy("summary");
          try { setSummary((await api.post(`/ai/books/${id}/summary`)).data); } finally { setBusy(""); }
        }
      }
    }).catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, [id, user?.id, user?.preferred_language]);
  useEffect(() => {
    if (!user) return;
    api.get("/conversations").then(({ data }) => setBookRoom(data.find((conversation) => conversation.type === "book" && Number(conversation.book_id) === Number(id)) || null)).catch(() => {});
  }, [id, user?.id]);
  useEffect(() => {
    if (!user || comments.length === 0) return;
    api.post("/comments/translate-batch", { ids: comments.map((comment) => comment.id) }).then(({ data }) => {
      setTranslatedComments(Object.fromEntries((data.translations || []).map((item) => [item.id, item.text])));
    }).catch(() => {});
  }, [comments, user?.id, user?.preferred_language]);

  const run = async (name, operation) => {
    try { setBusy(name); setNotice(""); await operation(); }
    catch (err) { setNotice(err.message); }
    finally { setBusy(""); }
  };
  const toggleFavorite = () => run("favorite", async () => {
    if (favorite) await api.delete(`/favorites/${id}`); else await api.post(`/favorites/${id}`);
    setFavorite(!favorite);
  });
  const rate = (value) => run("rating", async () => {
    const { data } = await api.post(`/books/${id}/rating`, { value });
    setRating({ average: data.average, count: data.count, user_value: value });
  });
  const publishComment = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    run("comment", async () => { await api.post(`/books/${id}/comments`, { text }); setText(""); await loadComments(); });
  };
  const deleteComment = (commentId) => run(`delete-${commentId}`, async () => {
    await api.delete(`/comments/${commentId}`);
    setComments((current) => current.filter((comment) => comment.id !== commentId));
  });
  const toggleCommentLike = (comment) => run(`like-comment-${comment.id}`, async () => {
    const { data } = comment.is_liked
      ? await api.delete(`/comments/${comment.id}/like`)
      : await api.post(`/comments/${comment.id}/like`);
    setComments((current) => current.map((item) => item.id === comment.id ? { ...item, is_liked: data.liked, like_count: data.count } : item));
  });
  const translateComment = (commentId) => run(`translate-${commentId}`, async () => {
    const { data } = await api.post(`/comments/${commentId}/translate`);
    setTranslatedComments((current) => ({ ...current, [commentId]: data.translation }));
  });
  const generateSummaryAudio = async () => {
    try {
      setBusy("summary-audio");
      setNotice("");
      const { data } = await api.post(`/ai/books/${id}/summary/audio`);
      setSummaryAudio(assetUrl(data.audio_url));
      setAudioUnavailable("");
    } catch (err) {
      if (String(err.code || "").startsWith("elevenlabs_")) setAudioUnavailable(err.message);
      else setNotice(err.message);
    } finally {
      setBusy("");
    }
  };
  const createBookRoom = () => run("create-book-room", async () => {
    const body = new FormData();
    body.append("name", `Club de lecture · ${book.title}`);
    body.append("book_id", id);
    const { data } = await api.post("/admin/conversations/group", body);
    setBookRoom({ id: data.id, type: "book", book_id: Number(id) });
    setNotice("Salon public créé. Les lecteurs peuvent maintenant le rejoindre.");
  });

  if (error) return <section className="container-page py-20"><State title="Book unavailable" text={error} /></section>;
  if (!book) return <Loader label={t("loading")} />;
  const pdfUrl = `${api.defaults.baseURL}/books/${id}/download/pdf`;

  return <section className="container-page py-12">
    {notice && <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-neutral-950 px-5 py-4 text-sm text-white">{notice}</div>}
    <div className="grid gap-10 lg:grid-cols-[330px_1fr]">
      <aside>{book.cover_image ? <img className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl" src={book.cover_image} alt={book.title} /> : <div className="grid aspect-[4/5] place-items-center rounded-[2rem] bg-neutral-200"><BookOpen size={60} /></div>}
        <div className="mt-5 grid gap-2">{book.html_url && <a target="_blank" rel="noreferrer" href={book.html_url} className="btn-dark"><BookOpen size={17} />{t("read")}</a>}<a href={pdfUrl} className="btn-light"><Download size={17} />{t("downloadPdf")}</a>{user && <button onClick={toggleFavorite} className={favorite ? "btn bg-red-50 text-red-700" : "btn-light"}><Heart size={17} fill={favorite ? "currentColor" : "none"} />{favorite ? t("removeFavorite") : t("addFavorite")}</button>}{user && bookRoom && <button onClick={() => run("book-room", async () => { await api.post(`/conversations/${bookRoom.id}/join`); navigate(`/messages?conversation=${bookRoom.id}`); })} className="btn-light"><Users size={17} />{busy === "book-room" ? "Connexion au salon…" : "Rejoindre le salon du livre"}</button>}{user?.role === "admin" && !bookRoom && <button disabled={busy === "create-book-room"} onClick={createBookRoom} className="btn-light"><Users size={17} />{busy === "create-book-room" ? "Création…" : "Créer le salon public du livre"}</button>}</div>
      </aside>
      <div><p className="text-xs font-bold uppercase tracking-[.25em] text-neutral-500">{book.language} · {book.download_count?.toLocaleString()}</p><h1 className="display mt-4 text-5xl leading-[.95] sm:text-7xl">{book.title}</h1><p className="mt-5 text-lg text-neutral-500">{book.authors.join(", ")}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4"><span className="flex items-center gap-2"><Star fill="currentColor" size={18} /><strong>{Number(rating.average).toFixed(1)}</strong><span className="text-sm text-neutral-500">{rating.count} {t("ratings")}</span></span><span className="flex items-center gap-1 text-sm text-neutral-500"><Heart size={16} />{book.favorite_count || 0}</span><span className="flex items-center gap-1 text-sm text-neutral-500"><Download size={16} />{Number(book.download_count || 0).toLocaleString()}</span></div>
        <div className="mt-7 flex flex-wrap gap-2">{book.categories.slice(0,8).map((category) => <span key={category} className="rounded-full bg-white px-3 py-1.5 text-xs">{category}</span>)}</div>
        <div className="mt-8 max-w-3xl"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">{user ? t("translatedSummary") : "Summary"}</p>{busy === "summary" ? <p className="flex items-center gap-2 text-neutral-500"><Sparkles className="animate-pulse" size={17} />{t("translating")}</p> : <><p className="leading-8 text-neutral-700">{summary?.summary || book.description || "—"}</p>{user && summary && <div className="mt-5">{summaryAudio ? <div className="rounded-2xl border bg-white p-4"><p className="mb-3 text-xs text-neutral-500">Voix générée par intelligence artificielle avec ElevenLabs.</p><audio controls className="w-full" src={summaryAudio} /><a href={summaryAudio} download className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline"><Download size={15} />Télécharger l’audio MP3</a></div> : audioUnavailable ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><strong>Lecture audio indisponible</strong><p className="mt-1">{audioUnavailable}</p></div> : <button disabled={busy === "summary-audio"} onClick={generateSummaryAudio} className="btn-light"><Volume2 size={17} />{busy === "summary-audio" ? "ElevenLabs prépare l’audio…" : "Écouter le résumé"}</button>}</div>}</>}</div>
        {user ? <div className="mt-8 rounded-2xl border bg-white p-5"><span className="text-sm font-semibold">{rating.user_value ? `${t("yourRating")}: ${rating.user_value}/5` : t("rateBook")}</span><div className="mt-2 flex">{[1,2,3,4,5].map((value) => <button key={value} onClick={() => rate(value)} className="p-1"><Star size={24} className={value <= (rating.user_value || 0) ? "fill-amber-400 text-amber-400" : "text-neutral-300"} /></button>)}</div></div> : <p className="mt-8 text-sm"><Link to="/login" className="font-bold underline">{t("login")}</Link></p>}
      </div>
    </div>

    {user && <section className="card mt-12 overflow-hidden"><div className="flex flex-col gap-4 border-b bg-neutral-950 p-7 text-white sm:flex-row sm:items-center sm:justify-between"><div><h2 className="flex items-center gap-2 text-xl font-bold"><Bot />{t("quiz")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">{t("howWorks")}</p></div><div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-4 py-3"><Trophy size={18}/><div><strong className="block">+10 points</strong><span className="text-[10px] text-neutral-400">{t("pointsPerAnswer")}</span></div></div></div><div className="p-7">{quizStatus.completed_this_week ? <div className="overflow-hidden rounded-2xl border border-amber-200"><div className="grid gap-3 bg-neutral-950 p-5 text-white sm:grid-cols-2">{quizStatus.result && <><div><p className="text-xs uppercase tracking-wider text-neutral-400">Votre dernière note</p><p className="mt-1 text-3xl font-extrabold">{quizStatus.result.score}%</p></div><div><p className="text-xs uppercase tracking-wider text-neutral-400">Points gagnés</p><p className="mt-1 text-3xl font-extrabold">+{quizStatus.result.points}</p></div></>}</div><p className="bg-amber-50 p-4 text-sm text-amber-800">Vous avez déjà passé ce QCM cette semaine. Vous pourrez le refaire lundi prochain.</p></div> : quiz.length === 0 ? <button disabled={busy === "quiz"} onClick={() => run("quiz", async () => setQuiz((await api.post(`/ai/books/${id}/quiz`)).data))} className="btn-dark">{busy === "quiz" ? t("loading") : t("generateQuiz")}</button> : <div className="space-y-6">{quiz.map((question,index) => <div key={question.id}><p className="font-semibold">{index+1}. {question.question}</p><div className="mt-3 grid gap-2">{["a","b","c","d"].map((key) => <label key={key} className={`flex gap-3 rounded-xl border p-3 text-sm ${answers[question.id] === key.toUpperCase() ? "border-black bg-neutral-50" : ""}`}><input type="radio" checked={answers[question.id] === key.toUpperCase()} onChange={() => setAnswers({ ...answers, [question.id]: key.toUpperCase() })} /><span>{key.toUpperCase()}. {question[`option_${key}`]}</span></label>)}</div></div>)}<div className="flex flex-wrap gap-2"><button onClick={() => run("submit", async () => { const submitted = (await api.post(`/books/${id}/quiz/submit`, { answers })).data; setResult(submitted); setQuizStatus({ completed_this_week: true, result: submitted }); await refresh(); })} className="btn-dark">{t("validate")}</button><button onClick={() => run("quiz", async () => { setAnswers({}); setResult(null); setQuiz((await api.post(`/ai/books/${id}/quiz`)).data); })} className="btn-light">{t("regenerate")}</button></div>{result && <p className="rounded-xl bg-neutral-950 p-4 text-white">{result.score}% · +{result.points}</p>}</div>}</div></section>}

    <CommunitySummaries bookId={id} user={user} />

    <section className="mt-10 overflow-hidden rounded-[2rem] border bg-white shadow-soft"><div className="bg-neutral-950 p-7 text-white"><p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{t("community")}</p><h2 className="display mt-2 text-3xl">{t("comments")}</h2>{user && <form className="mt-6 flex gap-3" onSubmit={publishComment}><input className="min-w-0 flex-1 rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-3" value={text} onChange={(event) => setText(event.target.value)} placeholder={t("commentPlaceholder")} /><button className="btn bg-white text-black"><Send size={17} />{t("publish")}</button></form>}</div>
      <div className="divide-y">{comments.length === 0 ? <p className="p-10 text-center text-sm text-neutral-500">{t("noComments")}</p> : comments.slice((commentPage-1)*10, commentPage*10).map((comment) => <article key={comment.id} className="flex gap-4 p-6">{comment.user_avatar ? <Link to={`/users/${comment.user_id}`}><img src={assetUrl(comment.user_avatar)} className="size-11 rounded-full object-cover" alt="" /></Link> : <Link to={`/users/${comment.user_id}`}><UserCircle className="shrink-0 text-neutral-400" size={40} /></Link>}<div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><Link to={`/users/${comment.user_id}`} className="font-bold hover:underline">{comment.user_name}</Link><time className="text-xs text-neutral-400">{new Date(comment.created_at).toLocaleDateString(language)}</time></div><p className="mt-3 leading-7">{translatedComments[comment.id] || comment.text}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold">{user && <button onClick={() => toggleCommentLike(comment)} className={`rounded-full border px-3 py-1.5 ${comment.is_liked ? "bg-neutral-950 text-white" : ""}`}><ThumbsUp size={13} className="inline" fill={comment.is_liked ? "currentColor" : "none"}/> {comment.like_count || 0}</button>}{!user && <span className="rounded-full border px-3 py-1.5"><ThumbsUp size={13} className="inline"/> {comment.like_count || 0}</span>}{user && <button onClick={() => translateComment(comment.id)} className="underline">{t("translate")}</button>}{user && <button onClick={() => setReport({ type: "comment", id: comment.id })} className="text-red-600"><Flag size={13} className="inline"/> Signaler</button>}</div></div>{user && (user.id === comment.user_id || user.role === "admin") && <button onClick={() => deleteComment(comment.id)} className="self-start rounded-xl p-2 text-red-600"><Trash2 size={17} /></button>}</article>)}</div>
      {comments.length > 10 && <div className="flex justify-center gap-2 border-t p-4"><button disabled={commentPage === 1} onClick={() => setCommentPage(commentPage-1)} className="btn-light">Précédent</button><span className="px-4 py-3 text-sm">{commentPage}/{Math.ceil(comments.length/10)}</span><button disabled={commentPage >= Math.ceil(comments.length/10)} onClick={() => setCommentPage(commentPage+1)} className="btn-dark">Suivant</button></div>}
    </section>
    <ReportDialog open={Boolean(report)} targetType={report?.type} targetId={report?.id} onClose={() => setReport(null)} />
  </section>;
}

function CommunitySummaries({ bookId, user }) {
  const [data, setData] = useState({ summaries: [], pagination: { page: 1, pages: 1 } });
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState("");
  const [translations, setTranslations] = useState({});
  const [reportId, setReportId] = useState(null);
  const load = () => api.get(`/books/${bookId}/community-summaries`, { params: { page } }).then((response) => setData(response.data));
  useEffect(() => { load().catch(() => {}); }, [bookId, page]);
  const publish = async (event) => { event.preventDefault(); await api.post(`/books/${bookId}/community-summaries`, { text }); setText(""); await load(); };
  const toggleLike = async (summary) => { const result = summary.is_liked ? await api.delete(`/community-summaries/${summary.id}/like`) : await api.post(`/community-summaries/${summary.id}/like`); setData((current) => ({ ...current, summaries: current.summaries.map((item) => item.id === summary.id ? { ...item, is_liked: result.data.liked, like_count: result.data.count } : item) })); };
  const openComments = async (summaryId) => {
    setExpanded(expanded === summaryId ? null : summaryId);
    if (!comments[summaryId]) {
      const response = await api.get(`/community-summaries/${summaryId}/comments`);
      setComments((current) => ({ ...current, [summaryId]: response.data.comments }));
    }
  };
  const addComment = async (summaryId) => {
    if (!commentText.trim()) return;
    await api.post(`/community-summaries/${summaryId}/comments`, { text: commentText });
    setCommentText("");
    const response = await api.get(`/community-summaries/${summaryId}/comments`);
    setComments((current) => ({ ...current, [summaryId]: response.data.comments }));
  };
  return <section className="card mt-10 p-7"><h2 className="text-2xl font-bold">Résumés de la communauté</h2><p className="mt-2 text-sm text-neutral-500">Les meilleurs résumés montent grâce aux likes, vues et commentaires.</p>{user && <form onSubmit={publish} className="mt-6"><textarea className="input min-h-32" minLength={50} required value={text} onChange={(event) => setText(event.target.value)} placeholder="Écrivez votre propre résumé…" /><button className="btn-dark mt-3">Publier mon résumé</button></form>}<div className="mt-7 space-y-4">{data.summaries.map((summary) => <article key={summary.id} className="rounded-2xl border p-5"><div className="flex items-center gap-3">{summary.user_avatar ? <img src={assetUrl(summary.user_avatar)} className="size-10 rounded-full object-cover" alt="" /> : <UserCircle size={34} />}<Link to={`/users/${summary.user_id}`} className="font-bold hover:underline">{summary.user_name}</Link></div><p className="mt-4 whitespace-pre-line leading-7">{translations[summary.id] || summary.text}</p><div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><button disabled={!user} onClick={() => toggleLike(summary)} className="rounded-full border px-3 py-2"><ThumbsUp size={14} className="inline" fill={summary.is_liked ? "currentColor" : "none"} /> {summary.like_count}</button><span className="rounded-full border px-3 py-2"><Eye size={14} className="inline" /> {summary.view_count}</span><button onClick={() => openComments(summary.id)} className="rounded-full border px-3 py-2"><MessageCircle size={14} className="inline" /> {summary.comment_count}</button>{user && <button onClick={async () => setTranslations({ ...translations, [summary.id]: (await api.post(`/community-summaries/${summary.id}/translate`)).data.translation })} className="rounded-full border px-3 py-2">Traduire</button>}{user && <button onClick={() => setReportId(summary.id)} className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">Signaler</button>}{user && (user.id === summary.user_id || user.role === "admin") && <button onClick={async () => { await api.delete(`/community-summaries/${summary.id}`); await load(); }} className="rounded-full bg-red-50 px-3 py-2 text-red-600">Supprimer</button>}</div>{expanded === summary.id && <div className="mt-4 border-t pt-4"><div className="space-y-2">{(comments[summary.id] || []).map((comment) => <div key={comment.id} className="rounded-xl bg-neutral-100 p-3 text-sm"><strong>{comment.user_name}</strong><p>{comment.text}</p></div>)}</div>{user && <div className="mt-3 flex gap-2"><input className="input" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Commenter ce résumé…" /><button onClick={() => addComment(summary.id)} className="btn-dark">Envoyer</button></div>}</div>}</article>)}</div>{data.pagination.pages > 1 && <div className="mt-6 flex justify-center gap-2"><button disabled={page === 1} onClick={() => setPage(page-1)} className="btn-light">Précédent</button><span className="px-4 py-3 text-sm">{page}/{data.pagination.pages}</span><button disabled={page === data.pagination.pages} onClick={() => setPage(page+1)} className="btn-dark">Suivant</button></div>}<ReportDialog open={Boolean(reportId)} targetType="summary" targetId={reportId} onClose={() => setReportId(null)} /></section>;
}
