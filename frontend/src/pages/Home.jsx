import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Crown,
  Download,
  Languages,
  Search,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { BookCard, SectionTitle } from "../components/UI";
import { useLanguage } from "../context/LanguageContext";
import { assetUrl } from "../lib/assets";

export default function Home() {
  const { t } = useLanguage();
  const [books, setBooks] = useState([]);
  const [rank, setRank] = useState([]);

  useEffect(() => {
    api.get("/books?limit=4").then(({ data }) => setBooks(data.books)).catch(() => {});
    api.get("/rank/weekly").then(({ data }) => setRank(data.slice(0, 3))).catch(() => {});
  }, []);

  const featured = books[0];

  return <main>
    <section className="relative overflow-hidden border-b bg-[#f3f3ef]">
      <div className="pointer-events-none absolute -right-32 -top-40 size-[34rem] rounded-full bg-amber-200/30 blur-3xl" />
      <div className="container-page relative py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[.18em] shadow-sm">
              <Sparkles size={14} className="text-amber-500" />{t("homeBadge")}
            </div>
            <h1 className="display mt-7 max-w-4xl text-5xl leading-[.94] sm:text-7xl xl:text-[5.5rem]">{t("homeTitle")}</h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-neutral-600 sm:text-lg">{t("homeText")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/books" className="btn-dark px-6 py-3">{t("explore")}<ArrowRight size={18} /></Link>
              <Link to="/chat" className="btn-light px-6 py-3"><Bot size={18} />{t("adviser")}</Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-3 divide-x rounded-2xl border bg-white p-4 shadow-sm">
              <HeroMetric value="3" label={t("languagesLabel")} />
              <HeroMetric value="IA" label={t("aiToolsLabel")} />
              <HeroMetric value="24/7" label={t("libraryAccessLabel")} />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-5 top-12 hidden rounded-2xl border bg-white p-4 shadow-xl sm:block">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><Star size={18} fill="currentColor" /></span><div><strong className="block text-sm">{t("readerReviews")}</strong><span className="text-xs text-neutral-400">{t("ratingsAndComments")}</span></div></div>
            </div>
            <div className="overflow-hidden rounded-[2.5rem] bg-neutral-950 p-6 text-white shadow-2xl sm:p-8">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-neutral-400"><BookOpen size={16} />{t("featuredBook")}</span><span className="size-2 rounded-full bg-emerald-400" /></div>
              {featured ? <div className="mt-7 grid items-center gap-6 sm:grid-cols-[150px_1fr]">
                {featured.cover_image ? <img src={featured.cover_image} alt={featured.title} className="aspect-[3/4] w-full rounded-2xl object-cover shadow-2xl" /> : <span className="grid aspect-[3/4] place-items-center rounded-2xl bg-white/10"><BookOpen size={42}/></span>}
                <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{featured.language?.toUpperCase()} · {Number(featured.download_count || 0).toLocaleString()} {t("reads")}</p><h2 className="display mt-3 line-clamp-3 text-3xl leading-tight">{featured.title}</h2><p className="mt-3 line-clamp-2 text-sm text-neutral-400">{featured.authors?.join(", ") || t("unknownAuthor")}</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs"><Star size={13} className="mr-1 inline" fill="currentColor"/>{Number(featured.average_rating || 0).toFixed(1)}</span><span className="rounded-full bg-white/10 px-3 py-2 text-xs"><Download size={13} className="mr-1 inline"/>{Number(featured.download_count || 0).toLocaleString()}</span></div><Link to={`/books/${featured.id}`} className="mt-6 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4">{t("viewBook")} <ArrowRight size={15}/></Link></div>
              </div> : <div className="mt-7 grid min-h-72 place-items-center rounded-3xl border border-white/10 bg-white/5"><BookOpen size={52} className="text-neutral-600"/></div>}
            </div>
            <div className="absolute -bottom-5 right-5 rounded-2xl border bg-white p-4 shadow-xl sm:right-10">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700"><BrainCircuit size={18} /></span><div><strong className="block text-sm">{t("aiAdviserTitle")}</strong><span className="text-xs text-neutral-400">{t("catalogBased")}</span></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="container-page py-20">
      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard icon={Search} title={t("exploreTitle")} text={t("exploreText")} />
        <FeatureCard icon={Languages} title={t("languageTitle")} text={t("languageText")} />
        <FeatureCard icon={BrainCircuit} title={t("progressTitle")} text={t("progressText")} />
      </div>
    </section>

    <section className="container-page pb-20">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <SectionTitle eyebrow={t("catalog")} title={t("popular")} />
        <Link to="/books" className="btn-light">{t("viewLibrary")}<ArrowRight size={16}/></Link>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{books.map((book) => <BookCard key={book.id} book={book} />)}</div>
    </section>

    <section className="container-page pb-20">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-neutral-950 px-6 py-12 text-white sm:px-10 lg:px-14">
        <div className="absolute right-0 top-0 size-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl"><span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Bot size={24}/></span><p className="mt-6 text-xs font-bold uppercase tracking-[.22em] text-violet-300">{t("readingAdviser")}</p><h2 className="display mt-3 text-4xl sm:text-6xl">{t("nextReadingTitle")}</h2><p className="mt-5 leading-8 text-neutral-400">{t("nextReadingText")}</p></div>
          <Link to="/chat" className="btn bg-white px-7 py-3 text-black hover:bg-neutral-200">{t("adviser")}<ArrowRight size={17} /></Link>
        </div>
      </div>
    </section>

    <section className="container-page pb-24">
      <div className="flex flex-wrap items-end justify-between gap-5"><SectionTitle eyebrow={t("communityLabel")} title={t("leaders")} /><Link to="/ranking" className="btn-light">{t("viewRanking")}<ArrowRight size={16}/></Link></div>
      {rank.length ? <div className="mt-8 grid gap-4 md:grid-cols-3">{rank.map((reader,index) => <Link to={`/users/${reader.id}`} className={`group relative overflow-hidden rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-xl ${index === 0 ? "bg-neutral-950 text-white" : "bg-white"}`} key={reader.id}>
        <div className="flex items-center gap-4">{reader.avatar_url ? <img src={assetUrl(reader.avatar_url)} className="size-14 rounded-2xl object-cover" alt="" /> : <span className={`grid size-14 place-items-center rounded-2xl ${index === 0 ? "bg-white/10" : "bg-neutral-100"}`}>{index === 0 ? <Crown size={22}/> : <Trophy size={19}/>}</span>}<div className="min-w-0"><p className={`text-xs font-bold uppercase tracking-wider ${index === 0 ? "text-amber-300" : "text-neutral-400"}`}>#{index+1} {t("weeklyRankLabel")}</p><p className="mt-1 truncate font-bold">{reader.name}</p></div></div><div className={`mt-6 flex items-end justify-between border-t pt-5 ${index === 0 ? "border-white/10" : ""}`}><span className={index === 0 ? "text-neutral-400" : "text-neutral-500"}>{t("weeklyPointsLabel")}</span><strong className="text-3xl">{reader.weekly_score}</strong></div>
      </Link>)}</div> : <div className="mt-8 rounded-3xl border-2 border-dashed p-10 text-center text-neutral-400">{t("emptyRanking")}</div>}
    </section>
  </main>;
}

function HeroMetric({ value, label }) {
  return <div className="px-3 text-center"><strong className="block text-lg sm:text-2xl">{value}</strong><span className="mt-1 block text-[9px] uppercase tracking-wider text-neutral-400 sm:text-[11px]">{label}</span></div>;
}

function FeatureCard({ icon: Icon, title, text }) {
  return <article className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><span className="grid size-12 place-items-center rounded-2xl bg-neutral-100 transition group-hover:bg-neutral-950 group-hover:text-white"><Icon size={21}/></span><h2 className="mt-6 text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-7 text-neutral-500">{text}</p></article>;
}
