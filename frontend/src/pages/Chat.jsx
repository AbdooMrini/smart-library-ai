import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import api from "../lib/api";
import { BookCard } from "../components/UI";
import { useLanguage } from "../context/LanguageContext";

const suggestions = [
  "Un roman en français très populaire",
  "Un classique d’aventure avec beaucoup d’action",
  "Un livre de philosophie accessible",
  "Une histoire courte et émouvante",
];

export default function Chat() {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ask = async (raw) => {
    const question = String(raw || "").trim();
    if (!question || loading) return;
    setLoading(true); setError(""); setMessage("");
    setConversation((items) => [...items, { role: "user", text: question }]);
    try {
      const { data } = await api.post("/chat/recommend", { message: question });
      const reply = typeof data?.reply === "string" ? data.reply : "Aucune recommandation disponible.";
      const databaseBooks = Array.isArray(data?.books) ? data.books.filter((book) => book?.id && book?.title) : [];
      setConversation((items) => [...items, { role: "assistant", text: reply, fallback: !data?.generated_by_ai }]);
      setBooks(databaseBooks);
    } catch (err) {
      setError(err.message);
      setConversation((items) => [...items, { role: "assistant", text: "La recherche a échoué. Réessayez avec un genre ou une langue.", error: true }]);
    } finally { setLoading(false); }
  };
  return <section className="container-page min-h-[70vh] py-14">
    <div className="mx-auto max-w-4xl text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-neutral-950 text-white"><Bot /></span><h1 className="display mt-6 text-5xl sm:text-7xl">{t("chatTitle")}</h1><p className="mx-auto mt-5 max-w-2xl text-neutral-600">Les réponses utilisent exclusivement les livres enregistrés dans la base MySQL.</p>{conversation.length === 0 && <div className="mt-8 flex flex-wrap justify-center gap-2">{suggestions.map((item) => <button key={item} onClick={() => ask(item)} className="rounded-full border bg-white px-4 py-2 text-sm hover:border-black">{item}</button>)}</div>}</div>
    {conversation.length > 0 && <div className="mx-auto mt-10 max-w-4xl space-y-4 rounded-[2rem] border bg-white p-5 shadow-soft">{conversation.map((item,index) => <div key={`${item.role}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] rounded-2xl px-5 py-4 text-sm leading-7 ${item.role === "user" ? "bg-neutral-950 text-white" : item.error ? "bg-red-50 text-red-700" : "bg-neutral-100"}`}>{item.role === "assistant" && <p className="mb-2 flex items-center gap-2 text-xs font-bold"><Bot size={14} />SMART AI</p>}<p>{item.text}</p>{item.fallback && !item.error && <p className="mt-2 text-xs opacity-60">Réponse locale basée sur MySQL.</p>}</div></div>)}{loading && <p className="flex items-center gap-2 text-sm text-neutral-500"><Sparkles className="animate-pulse" size={17} />Analyse de la bibliothèque…</p>}</div>}
    <form onSubmit={(event) => { event.preventDefault(); ask(message); }} className="mx-auto mt-6 flex max-w-4xl rounded-full bg-white p-2 shadow-soft"><input className="min-w-0 flex-1 bg-transparent px-5" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Genre, langue, thème ou ambiance…" /><button className="btn-dark" disabled={loading || !message.trim()}><Send size={18} />{t("send")}</button></form>
    {error && <p className="mx-auto mt-4 max-w-4xl text-sm text-red-600">{error}</p>}
    {books.length > 0 && <div className="mt-12"><h2 className="display mb-6 text-3xl">{t("selection")}</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">{books.map((book) => <BookCard key={book.id} book={book} />)}</div></div>}
  </section>;
}
