import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Loader } from "../components/UI";

export default function Notifications() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const load = () => api.get("/notifications", { params: { page, limit: 20 } }).then(({ data: result }) => setData(result));
  useEffect(() => { load(); }, [page]);
  if (!data) return <Loader />;
  return <section className="container-page py-12">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.24em] text-neutral-400">Historique</p><h1 className="display mt-2 text-5xl">Notifications</h1><p className="mt-3 text-neutral-500">Retrouvez toutes les notifications lues et non lues.</p></div><button onClick={async () => { await api.put("/notifications/read-all"); load(); }} className="btn-light"><CheckCheck size={17} />Tout marquer comme lu</button></div>
    <div className="mt-8 overflow-hidden rounded-3xl border bg-white">{data.notifications.length ? data.notifications.map((item) => <article key={item.id} className={`flex gap-4 border-b p-5 last:border-0 ${item.is_read ? "" : "bg-blue-50"}`}><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-neutral-950 text-white"><Bell size={18} /></span><Link onClick={() => !item.is_read && api.put(`/notifications/${item.id}/read`)} to={item.link || "#"} className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{item.title}</strong>{!item.is_read && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">NOUVEAU</span>}</div><p className="mt-1 text-sm text-neutral-600">{item.message}</p><time className="mt-2 block text-xs text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></Link><button onClick={async () => { await api.delete(`/notifications/${item.id}`); load(); }} className="self-start rounded-xl p-2 text-red-600 hover:bg-red-50"><Trash2 size={17} /></button></article>) : <p className="p-12 text-center text-neutral-500">Aucune notification.</p>}</div>
    {data.pagination.pages > 1 && <div className="mt-6 flex justify-center gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-light">Précédent</button><span className="px-4 py-3 text-sm">{page}/{data.pagination.pages}</span><button disabled={page === data.pagination.pages} onClick={() => setPage(page + 1)} className="btn-dark">Suivant</button></div>}
  </section>;
}
