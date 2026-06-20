import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookHeart,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  Heart,
  History,
  LifeBuoy,
  MessageCircle,
  Save,
  Send,
  Settings,
  Sparkles,
  TicketCheck,
  Trophy,
  User,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { assetUrl } from "../lib/assets";
import AvatarCropper from "../components/AvatarCropper";
import { BookCard } from "../components/UI";

const copy = {
  fr: {
    subtitle: "Gérez votre identité, vos lectures et toute votre activité depuis un seul espace.",
    overview: "Mon profil",
    favorites: "Favoris",
    comments: "Commentaires",
    wishes: "Souhaits",
    ranking: "Classement",
    visitors: "Visiteurs",
    support: "Support",
    accountTitle: "Informations personnelles",
    accountText: "Mettez à jour votre nom, votre adresse e-mail, votre mot de passe et la langue du site.",
    photoTitle: "Photo de profil",
    photoText: "Choisissez une image, recadrez-la puis enregistrez votre nouvelle photo.",
    imageReady: "Votre photo recadrée est prête.",
    changePhoto: "Choisir une photo",
    publicProfile: "Voir mon profil public",
    emptyFavorites: "Vous n’avez encore ajouté aucun livre à vos favoris.",
    emptyComments: "Vous n’avez encore publié aucun commentaire.",
    emptyWishes: "Vous n’avez encore envoyé aucun souhait.",
    emptyHistory: "Aucun classement hebdomadaire enregistré.",
    emptyVisitors: "Votre profil n’a pas encore reçu de visite.",
    createWish: "Proposer un nouveau livre",
    wishInfo: "Un minimum de 50 points hebdomadaires est nécessaire pour envoyer un souhait.",
    visitorAnonymous: "Visiteur sans profil",
    tickets: "Mes demandes",
    noTickets: "Vous n’avez encore envoyé aucune demande au support.",
    sendSupport: "Contacter le support",
    member: "Membre Smart Library",
    currentWeek: "Cette semaine",
    total: "Points au total",
    rank: "Rang actuel",
    savedBooks: "livre(s) enregistré(s)",
    publishedComments: "commentaire(s) publié(s)",
    requests: "demande(s)",
    recentVisits: "visite(s) récente(s)",
    supportText: "Décrivez votre problème. Un administrateur pourra vous répondre directement.",
    subject: "Sujet",
    message: "Message",
    adminReply: "Réponse de l’administration",
  },
  en: {
    subtitle: "Manage your identity, reading and activity from one clear space.",
    overview: "My profile",
    favorites: "Favorites",
    comments: "Comments",
    wishes: "Requests",
    ranking: "Ranking",
    visitors: "Visitors",
    support: "Support",
    accountTitle: "Personal information",
    accountText: "Update your name, email address, password and website language.",
    photoTitle: "Profile photo",
    photoText: "Choose an image, crop it and save your new profile photo.",
    imageReady: "Your cropped photo is ready.",
    changePhoto: "Choose a photo",
    publicProfile: "View my public profile",
    emptyFavorites: "You have not added any favorite books yet.",
    emptyComments: "You have not posted any comments yet.",
    emptyWishes: "You have not submitted any book requests yet.",
    emptyHistory: "No weekly ranking has been recorded.",
    emptyVisitors: "Your profile has not received any visits yet.",
    createWish: "Suggest a new book",
    wishInfo: "You need at least 50 weekly points to submit a request.",
    visitorAnonymous: "Visitor without a profile",
    tickets: "My requests",
    noTickets: "You have not contacted support yet.",
    sendSupport: "Contact support",
    member: "Smart Library member",
    currentWeek: "This week",
    total: "Total points",
    rank: "Current rank",
    savedBooks: "saved book(s)",
    publishedComments: "published comment(s)",
    requests: "request(s)",
    recentVisits: "recent visit(s)",
    supportText: "Describe your issue. An administrator will be able to reply directly.",
    subject: "Subject",
    message: "Message",
    adminReply: "Administration reply",
  },
  ar: {
    subtitle: "أدر هويتك وقراءاتك وكل نشاطك من مساحة واحدة واضحة.",
    overview: "ملفي الشخصي",
    favorites: "المفضلة",
    comments: "التعليقات",
    wishes: "الطلبات",
    ranking: "الترتيب",
    visitors: "الزوار",
    support: "الدعم",
    accountTitle: "المعلومات الشخصية",
    accountText: "حدّث الاسم والبريد الإلكتروني وكلمة المرور ولغة الموقع.",
    photoTitle: "الصورة الشخصية",
    photoText: "اختر صورة واقتصّها ثم احفظ صورة ملفك الجديدة.",
    imageReady: "الصورة المقصوصة جاهزة.",
    changePhoto: "اختيار صورة",
    publicProfile: "عرض ملفي العام",
    emptyFavorites: "لم تضف أي كتاب إلى المفضلة بعد.",
    emptyComments: "لم تنشر أي تعليق بعد.",
    emptyWishes: "لم ترسل أي طلب كتاب بعد.",
    emptyHistory: "لا يوجد سجل ترتيب أسبوعي.",
    emptyVisitors: "لم يتلق ملفك أي زيارة بعد.",
    createWish: "اقتراح كتاب جديد",
    wishInfo: "تحتاج إلى 50 نقطة أسبوعية على الأقل لإرسال طلب.",
    visitorAnonymous: "زائر بدون ملف",
    tickets: "طلباتي",
    noTickets: "لم تراسل الدعم بعد.",
    sendSupport: "مراسلة الدعم",
    member: "عضو Smart Library",
    currentWeek: "هذا الأسبوع",
    total: "مجموع النقاط",
    rank: "الترتيب الحالي",
    savedBooks: "كتاب محفوظ",
    publishedComments: "تعليق منشور",
    requests: "طلب",
    recentVisits: "زيارة حديثة",
    supportText: "اشرح مشكلتك وسيتمكن المسؤول من الرد عليك مباشرة.",
    subject: "الموضوع",
    message: "الرسالة",
    adminReply: "رد الإدارة",
  },
};

export default function Profile() {
  const { user, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const { t, language, setLanguage } = useLanguage();
  const labels = copy[language] || copy.fr;
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "overview");
  const [profile, setProfile] = useState({ name: user.name, email: user.email, password: "", preferred_language: user.preferred_language || "fr" });
  const [activity, setActivity] = useState({ comments: [], wishes: [], history: [], favorites: [], viewers: [] });
  const [wish, setWish] = useState({ book_title: "", author: "", message: "" });
  const [rank, setRank] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [support, setSupport] = useState({ subject: "", message: "" });
  const [tickets, setTickets] = useState([]);

  const load = async () => {
    const [ranking, details, supportResponse] = await Promise.all([api.get("/rank/weekly"), api.get("/auth/activity"), api.get("/support")]);
    setRank(ranking.data.findIndex((reader) => reader.id === user.id) + 1 || null);
    setActivity(details.data);
    setTickets(supportResponse.data);
  };

  useEffect(() => {
    setProfile({ name: user.name, email: user.email, password: "", preferred_language: user.preferred_language || "fr" });
    load().catch(() => {});
  }, [user.id, user.name, user.email, user.preferred_language, user.weekly_score]);

  const tabs = useMemo(() => [
    { id: "overview", label: labels.overview, icon: Settings },
    { id: "favorites", label: labels.favorites, icon: Heart, count: activity.favorites?.length },
    { id: "comments", label: labels.comments, icon: MessageCircle, count: activity.comments?.length },
    { id: "wishes", label: labels.wishes, icon: BookOpen, count: activity.wishes?.length },
    { id: "ranking", label: labels.ranking, icon: Trophy, count: activity.history?.length },
    { id: "visitors", label: labels.visitors, icon: Eye, count: activity.viewers?.length },
    { id: "support", label: labels.support, icon: LifeBuoy, count: tickets.length },
  ], [activity, labels, tickets.length]);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setBusy("profile");
      setNotice((await api.put("/auth/profile", profile)).data.message);
      setLanguage(profile.preferred_language);
      await refresh();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  };

  const uploadAvatar = async (event) => {
    event.preventDefault();
    if (!avatar) return;
    try {
      setBusy("avatar");
      const body = new FormData();
      body.append("avatar", avatar);
      setNotice((await api.post("/auth/profile/avatar", body)).data.message);
      setAvatar(null);
      await refresh();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  };

  const submitWish = async (event) => {
    event.preventDefault();
    try {
      setBusy("wish");
      setNotice((await api.post("/wishes", wish)).data.message);
      setWish({ book_title: "", author: "", message: "" });
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  };

  const submitSupport = async (event) => {
    event.preventDefault();
    try {
      setBusy("support");
      setNotice((await api.post("/support", support)).data.message);
      setSupport({ subject: "", message: "" });
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  };
  const replySupport = async (ticketId, event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = new FormData(form).get("message")?.trim();
    if (!message) return;
    try {
      setBusy(`support-${ticketId}`);
      setNotice((await api.post(`/support/${ticketId}/messages`, { message })).data.message);
      form.reset();
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="container-page py-8 sm:py-12" dir={language === "ar" ? "rtl" : "ltr"}>
      {notice && (
        <button onClick={() => setNotice("")} className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left text-sm shadow-sm">
          <CheckCircle2 size={19} className="shrink-0 text-emerald-600" />
          <span className="flex-1">{notice}</span>
          <span className="text-xs text-neutral-400">×</span>
        </button>
      )}

      <header className="overflow-hidden rounded-[2rem] bg-neutral-950 text-white shadow-2xl">
        <div className="relative p-6 sm:p-9">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
              <button onClick={() => user.avatar_url && setImageOpen(true)} className="group relative shrink-0">
                {user.avatar_url ? (
                  <img src={assetUrl(user.avatar_url)} className="size-28 rounded-[2rem] border-4 border-white/15 object-cover sm:size-32" alt={user.name} />
                ) : (
                  <span className="grid size-28 place-items-center rounded-[2rem] border-4 border-white/10 bg-white/10 sm:size-32"><User size={46} /></span>
                )}
                <span className="absolute bottom-1 right-1 grid size-9 place-items-center rounded-full bg-white text-black shadow-lg"><Camera size={16} /></span>
              </button>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[.24em] text-neutral-400">{labels.member}</p>
                <h1 className="display mt-2 truncate text-4xl sm:text-5xl">{user.name}</h1>
                <p className="mt-2 truncate text-sm text-neutral-400">{user.email}</p>
                <Link to={`/users/${user.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline decoration-neutral-600 underline-offset-4 hover:decoration-white">
                  <Eye size={16} />{labels.publicProfile}
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <HeaderStat icon={Award} value={user.score} label={labels.total} />
              <HeaderStat icon={Sparkles} value={user.weekly_score} label={labels.currentWeek} />
              <HeaderStat icon={Trophy} value={rank ? `#${rank}` : "—"} label={labels.rank} />
            </div>
          </div>
        </div>
      </header>

      <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-6 text-neutral-500">{labels.subtitle}</p>

      <nav className="mt-7 overflow-x-auto rounded-2xl border bg-white p-2 shadow-sm">
        <div className="flex min-w-max gap-1">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${activeTab === id ? "bg-neutral-950 text-white shadow-md" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"}`}
            >
              <Icon size={17} />
              {label}
              {id !== "overview" && <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === id ? "bg-white/15" : "bg-neutral-100"}`}>{count || 0}</span>}
            </button>
          ))}
        </div>
      </nav>

      <main className="mt-6">
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <SectionCard icon={Camera} title={labels.photoTitle} description={labels.photoText}>
              <form onSubmit={uploadAvatar}>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center hover:border-neutral-950 hover:bg-white">
                  <Camera size={28} />
                  <span className="mt-3 font-bold">{labels.changePhoto}</span>
                  <span className="mt-1 text-xs text-neutral-400">JPG, PNG ou WEBP · 3 MB max.</span>
                  <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files[0] && setCropFile(event.target.files[0])} />
                </label>
                {avatar && <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={17} />{labels.imageReady}</p>}
                <button disabled={!avatar || busy === "avatar"} className="btn-dark mt-4 w-full"><Camera size={16} />{busy === "avatar" ? t("loading") : t("upload")}</button>
              </form>
            </SectionCard>

            <SectionCard icon={Settings} title={labels.accountTitle} description={labels.accountText}>
              <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                <Field label={t("name")}><input className="input" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></Field>
                <Field label={t("email")}><input className="input" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></Field>
                <Field label={t("password")}><input className="input" type="password" minLength={6} value={profile.password} onChange={(event) => setProfile({ ...profile, password: event.target.value })} placeholder="••••••••" /></Field>
                <Field label={t("language")}><select className="input" value={profile.preferred_language} onChange={(event) => setProfile({ ...profile, preferred_language: event.target.value })}><option value="fr">Français</option><option value="en">English</option><option value="ar">العربية</option></select></Field>
                <button disabled={busy === "profile"} className="btn-dark sm:col-span-2 sm:justify-self-start"><Save size={16} />{busy === "profile" ? t("loading") : t("save")}</button>
              </form>
            </SectionCard>
          </div>
        )}

        {activeTab === "favorites" && (
          <SectionCard icon={BookHeart} title={labels.favorites} description={`${activity.favorites?.length || 0} ${labels.savedBooks}`}>
            {activity.favorites?.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{activity.favorites.map((book) => <BookCard key={book.id} book={book} />)}</div> : <EmptyState icon={Heart} text={labels.emptyFavorites} />}
          </SectionCard>
        )}

        {activeTab === "comments" && (
          <SectionCard icon={MessageCircle} title={labels.comments} description={`${activity.comments?.length || 0} ${labels.publishedComments}`}>
            {activity.comments?.length ? <div className="grid gap-3 md:grid-cols-2">{activity.comments.map((item) => <Link to={`/books/${item.book_id}`} key={item.id} className="group rounded-2xl border bg-neutral-50 p-5 hover:border-neutral-950 hover:bg-white"><div className="flex items-start justify-between gap-3"><strong className="group-hover:underline">{item.book_title}</strong><MessageCircle size={17} className="shrink-0 text-neutral-400" /></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">{item.text}</p>{item.created_at && <p className="mt-4 text-xs text-neutral-400">{new Date(item.created_at).toLocaleDateString(language)}</p>}</Link>)}</div> : <EmptyState icon={MessageCircle} text={labels.emptyComments} />}
          </SectionCard>
        )}

        {activeTab === "wishes" && (
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
            <SectionCard icon={Send} title={labels.createWish} description={labels.wishInfo}>
              <form onSubmit={submitWish} className="grid gap-4">
                <Field label={t("bookTitle")}><input className="input" required value={wish.book_title} onChange={(event) => setWish({ ...wish, book_title: event.target.value })} /></Field>
                <Field label={t("author")}><input className="input" value={wish.author} onChange={(event) => setWish({ ...wish, author: event.target.value })} /></Field>
                <Field label={t("whyBook")}><textarea className="input min-h-28 resize-y" value={wish.message} onChange={(event) => setWish({ ...wish, message: event.target.value })} /></Field>
                <button disabled={busy === "wish" || user.weekly_score < 50} className="btn-dark"><Send size={16} />{busy === "wish" ? t("loading") : t("sendWish")}</button>
              </form>
            </SectionCard>
            <SectionCard icon={BookOpen} title={labels.wishes} description={`${activity.wishes?.length || 0} ${labels.requests}`}>
              {activity.wishes?.length ? <div className="space-y-3">{activity.wishes.map((item) => <div key={item.id} className="rounded-2xl border bg-neutral-50 p-5"><div className="flex items-start justify-between gap-4"><div><strong>{item.book_title}</strong>{item.author && <p className="mt-1 text-sm text-neutral-500">{item.author}</p>}</div><Status value={item.status} /></div>{item.message && <p className="mt-4 text-sm leading-6 text-neutral-600">{item.message}</p>}</div>)}</div> : <EmptyState icon={BookOpen} text={labels.emptyWishes} />}
            </SectionCard>
          </div>
        )}

        {activeTab === "ranking" && (
          <SectionCard icon={History} title={labels.ranking} description={t("rankHistory")}>
            {activity.history?.length ? <div className="overflow-hidden rounded-2xl border"><div className="hidden grid-cols-3 bg-neutral-950 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white sm:grid"><span>{t("thisWeek")}</span><span className="text-center">{t("yourRank")}</span><span className="text-right">{t("totalPoints")}</span></div>{activity.history.map((item) => <div key={item.week_start} className="grid gap-2 border-t p-5 first:border-t-0 sm:grid-cols-3 sm:items-center"><span className="flex items-center gap-2 text-sm"><Clock3 size={16} className="text-neutral-400" />{new Date(item.week_start).toLocaleDateString(language)}</span><strong className="text-2xl sm:text-center">#{item.rank_position}</strong><span className="font-semibold sm:text-right">{item.weekly_score} pts</span></div>)}</div> : <EmptyState icon={Trophy} text={labels.emptyHistory} />}
          </SectionCard>
        )}

        {activeTab === "visitors" && (
          <SectionCard icon={Eye} title={labels.visitors} description={`${activity.viewers?.length || 0} ${labels.recentVisits}`}>
            {activity.viewers?.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{activity.viewers.map((viewer, index) => viewer.id ? <Link to={`/users/${viewer.id}`} key={`${viewer.id}-${index}`} className="flex items-center gap-4 rounded-2xl border bg-neutral-50 p-4 hover:border-neutral-950 hover:bg-white">{viewer.avatar_url ? <img src={assetUrl(viewer.avatar_url)} className="size-12 rounded-2xl object-cover" alt={viewer.name} /> : <span className="grid size-12 place-items-center rounded-2xl bg-neutral-200"><User size={22} /></span>}<div className="min-w-0"><strong className="block truncate">{viewer.name}</strong><span className="text-xs text-neutral-400">{viewer.created_at ? new Date(viewer.created_at).toLocaleDateString(language) : labels.member}</span></div></Link> : <div key={`anonymous-${index}`} className="flex items-center gap-4 rounded-2xl border bg-neutral-50 p-4"><span className="grid size-12 place-items-center rounded-2xl bg-neutral-200"><User size={22} /></span><span className="font-semibold">{labels.visitorAnonymous}</span></div>)}</div> : <EmptyState icon={Eye} text={labels.emptyVisitors} />}
          </SectionCard>
        )}

        {activeTab === "support" && (
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <SectionCard icon={LifeBuoy} title={labels.sendSupport} description={labels.supportText}>
              <form onSubmit={submitSupport} className="grid gap-4">
                <Field label={labels.subject}><input className="input" required value={support.subject} onChange={(event) => setSupport({ ...support, subject: event.target.value })} /></Field>
                <Field label={labels.message}><textarea className="input min-h-36 resize-y" required value={support.message} onChange={(event) => setSupport({ ...support, message: event.target.value })} /></Field>
                <button disabled={busy === "support"} className="btn-dark"><Send size={16} />{busy === "support" ? t("loading") : labels.sendSupport}</button>
              </form>
            </SectionCard>
            <SectionCard icon={TicketCheck} title={labels.tickets} description={`${tickets.length} ${labels.requests}`}>
              {tickets.length ? <div className="space-y-4">{tickets.map((ticket) => <article key={ticket.id} className="overflow-hidden rounded-2xl border bg-neutral-50"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white p-4"><div><strong>{ticket.subject}</strong><p className="mt-1 text-xs text-neutral-400">{new Date(ticket.created_at).toLocaleString(language)}</p></div><Status value={ticket.status} /></div><div className="space-y-3 p-4">{(ticket.messages || []).map((message) => <div key={message.id} className={`flex ${message.user_role === "admin" ? "justify-start" : "justify-end"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.user_role === "admin" ? "bg-white" : "bg-neutral-950 text-white"}`}><p className="whitespace-pre-wrap">{message.message}</p><time className="mt-2 block text-[10px] opacity-50">{new Date(message.created_at).toLocaleString(language)}</time></div></div>)}{ticket.status !== "closed" && <form onSubmit={(event) => replySupport(ticket.id, event)} className="flex gap-2 border-t pt-4"><input className="input" name="message" required placeholder={labels.message} /><button disabled={busy === `support-${ticket.id}`} className="btn-dark shrink-0"><Send size={16} /></button></form>}</div></article>)}</div> : <EmptyState icon={LifeBuoy} text={labels.noTickets} />}
            </SectionCard>
          </div>
        )}
      </main>

      {cropFile && <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onConfirm={(file) => { setAvatar(file); setCropFile(null); }} />}
      {imageOpen && <button onClick={() => setImageOpen(false)} className="fixed inset-0 z-[80] grid h-full w-full place-items-center bg-black/90 p-6"><img src={assetUrl(user.avatar_url)} className="max-h-full max-w-full rounded-3xl object-contain" alt={user.name} /></button>}
    </section>
  );
}

function HeaderStat({ icon: Icon, value, label }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur sm:min-w-32 sm:p-4"><Icon size={17} className="text-neutral-300" /><p className="mt-3 text-xl font-extrabold sm:text-2xl">{value}</p><p className="mt-1 truncate text-[10px] text-neutral-400 sm:text-xs">{label}</p></div>;
}

function SectionCard({ icon: Icon, title, description, children }) {
  return <section className="card h-fit p-5 sm:p-7"><div className="mb-6 flex items-start gap-4 border-b pb-5"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-neutral-950 text-white"><Icon size={20} /></span><div><h2 className="text-xl font-bold">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p>}</div></div>{children}</section>;
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</span>{children}</label>;
}

function EmptyState({ icon: Icon, text }) {
  return <div className="grid min-h-56 place-items-center rounded-3xl border-2 border-dashed bg-neutral-50 p-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white shadow-sm"><Icon size={24} /></span><p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-neutral-500">{text}</p></div></div>;
}

function Status({ value }) {
  const styles = {
    accepted: "bg-emerald-100 text-emerald-700",
    answered: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    open: "bg-amber-100 text-amber-700",
    refused: "bg-red-100 text-red-700",
    closed: "bg-neutral-200 text-neutral-600",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${styles[value] || "bg-neutral-200 text-neutral-600"}`}>{value}</span>;
}
