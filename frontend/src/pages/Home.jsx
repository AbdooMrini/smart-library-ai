import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Bot, Sparkles, Trophy } from "lucide-react";
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
    api.get("/rank/weekly").then(({ data }) => setRank(data.slice(0,3))).catch(() => {});
  }, []);
  return <>
    <section className="container-page py-16 sm:py-24"><div className="grid items-center gap-12 lg:grid-cols-[1.2fr_.8fr]"><div><div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider"><Sparkles size={15} />{t("homeBadge")}</div><h1 className="display max-w-4xl text-5xl leading-[.95] sm:text-7xl lg:text-8xl">{t("homeTitle")}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-600">{t("homeText")}</p><div className="mt-9 flex flex-wrap gap-3"><Link to="/books" className="btn-dark">{t("explore")}<ArrowRight size={18} /></Link><Link to="/chat" className="btn-light"><Bot size={18} />{t("adviser")}</Link></div></div><div className="mx-auto aspect-[4/5] w-full max-w-md rotate-3 rounded-[2.5rem] bg-neutral-950 p-8 text-white shadow-2xl"><BookOpen /><div className="flex h-full items-center"><p className="display text-5xl">Smart Library AI</p></div></div></div></section>
    <section className="container-page py-20"><SectionTitle eyebrow="" title={t("popular")} /><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{books.map((book) => <BookCard key={book.id} book={book} />)}</div></section>
    <section className="bg-neutral-950 py-20 text-white"><div className="container-page grid items-center gap-10 lg:grid-cols-2"><div><Sparkles size={34} /><h2 className="display mt-5 text-5xl">Mistral AI</h2><p className="mt-5 max-w-xl text-neutral-400">{t("homeText")}</p></div><Link to="/chat" className="btn bg-white text-black hover:bg-neutral-200">{t("adviser")}<ArrowRight size={17} /></Link></div></section>
    <section className="container-page py-20"><SectionTitle eyebrow="" title={t("leaders")} /><div className="grid gap-4 md:grid-cols-3">{rank.map((reader,index) => <div className="card flex items-center gap-4 p-6" key={reader.id}>{reader.avatar_url ? <img src={assetUrl(reader.avatar_url)} className="size-12 rounded-full object-cover" alt="" /> : <span className="grid size-12 place-items-center rounded-full bg-neutral-100"><Trophy size={18} /></span>}<div><p className="font-bold">#{index+1} {reader.name}</p><p className="text-sm text-neutral-500">{reader.weekly_score} pts</p></div></div>)}</div></section>
  </>;
}
