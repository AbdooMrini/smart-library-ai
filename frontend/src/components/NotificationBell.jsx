import { Bell, History } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const load = () => api.get("/notifications", { params: { unread: 1, limit: 10 } }).then((response) => setData(response.data)).catch(() => {});
  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, []);
  const read = async (notification) => { if (!notification.is_read) await api.put(`/notifications/${notification.id}/read`); setOpen(false); load(); };
  return <div className="relative"><button onClick={() => setOpen(!open)} className="relative rounded-full border bg-white p-3"><Bell size={18} />{data.unread > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-600 text-[10px] text-white">{Math.min(data.unread, 9)}</span>}</button>{open && <div className="absolute right-0 top-14 z-50 w-[min(380px,90vw)] overflow-hidden rounded-2xl border bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-4"><strong>Nouvelles notifications</strong><button onClick={async () => { await api.put("/notifications/read-all"); load(); }} className="text-xs underline">Tout lire</button></div><div className="max-h-96 overflow-y-auto">{data.notifications.length ? data.notifications.map((item) => <Link onClick={() => read(item)} to={item.link || "#"} key={item.id} className="block border-b bg-blue-50 p-4 text-sm hover:bg-blue-100"><strong>{item.title}</strong><p className="mt-1 text-neutral-600">{item.message}</p><time className="mt-2 block text-xs text-neutral-400">{new Date(item.created_at).toLocaleString("fr")}</time></Link>) : <p className="p-8 text-center text-sm text-neutral-500">Aucune nouvelle notification.</p>}</div><Link onClick={() => setOpen(false)} to="/notifications" className="flex items-center justify-center gap-2 border-t p-4 text-sm font-bold hover:bg-neutral-50"><History size={16} />Voir tout l’historique</Link></div>}</div>;
}
