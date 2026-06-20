import { useEffect, useRef, useState } from "react";
import { Ban, Clock3, Edit3, Mic, Plus, Send, Settings, Trash2, UserPlus, Users, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { assetUrl } from "../lib/assets";
import { useAuth } from "../context/AuthContext";
import { ConfirmDialog } from "../components/Dialogs";

export default function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(Number(params.get("conversation")) || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [audio, setAudio] = useState(null);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState(false);
  const [group, setGroup] = useState({ name: "", book_id: "", member_ids: [], image: null });
  const [members, setMembers] = useState([]);
  const [notice, setNotice] = useState("");
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [blockedUsers, setBlockedUsers] = useState([]);
  const recorder = useRef(null);
  const chunks = useRef([]);

  const loadConversations = () => api.get("/conversations").then((response) => setConversations(response.data));
  const loadMessages = () => selected && api.get(`/conversations/${selected}/messages`).then((response) => setMessages(response.data));
  const loadMembers = () => selected && api.get(`/conversations/${selected}/members`).then((response) => setMembers(response.data)).catch(() => setMembers([]));
  const loadBlockedUsers = () => api.get("/users/blocks").then(({ data }) => setBlockedUsers(data || [])).catch(() => setBlockedUsers([]));
  useEffect(() => {
    loadConversations();
    loadBlockedUsers();
    api.get("/books", { params: { limit: 50 } }).then(({ data }) => setBooks(data.books || [])).catch(() => {});
    api.get("/users").then(({ data }) => setUsers(data || [])).catch(() => {});
    const timer = setInterval(loadConversations, 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (!selected) return; setParams({ conversation: selected }); loadMessages(); loadMembers(); const timer = setInterval(() => { loadMessages(); loadConversations(); }, 4000); return () => clearInterval(timer); }, [selected]);

  const send = async (event) => {
    event.preventDefault();
    if (!selected || (!text.trim() && !audio)) return;
    if (editing) { await api.put(`/messages/${editing}`, { text }); setEditing(null); }
    else { const body = new FormData(); if (text.trim()) body.append("text", text); if (audio) body.append("audio", audio); await api.post(`/conversations/${selected}/messages`, body); }
    setText(""); setAudio(null); await loadMessages(); await loadConversations();
  };
  const toggleRecord = async () => {
    if (recording) { recorder.current.stop(); setRecording(false); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder.current = new MediaRecorder(stream);
    chunks.current = [];
    recorder.current.ondataavailable = (event) => chunks.current.push(event.data);
    recorder.current.onstop = () => { setAudio(new File(chunks.current, `audio-${Date.now()}.webm`, { type: recorder.current.mimeType || "audio/webm" })); stream.getTracks().forEach((track) => track.stop()); };
    recorder.current.start(); setRecording(true);
  };
  const createGroup = async (event) => {
    event.preventDefault(); const body = new FormData(); body.append("name", group.name); if (group.book_id) body.append("book_id", group.book_id); if (group.member_ids.length) body.append("member_ids", group.member_ids.join(",")); if (group.image) body.append("image", group.image);
    const endpoint = user.role === "admin" && group.book_id ? "/admin/conversations/group" : "/conversations/group";
    const { data } = await api.post(endpoint, body); setGroupOpen(false); setGroup({ name: "", book_id: "", member_ids: [], image: null }); await loadConversations(); setSelected(data.id);
  };
  const selectedConversation = conversations.find((conversation) => conversation.id === selected);
  const editGroup = async (event) => {
    event.preventDefault(); const body = new FormData(); body.append("name", group.name || selectedConversation?.display_name || "Groupe"); if (group.image) body.append("image", group.image);
    await api.put(`/conversations/${selected}`, body); setGroupEditOpen(false); setGroup({ name: "", book_id: "", member_ids: [], image: null }); loadConversations();
  };
  const canManage = selectedConversation && ["group", "book"].includes(selectedConversation.type) && (user.role === "admin" || selectedConversation.created_by === user.id || members.find((member) => member.id === user.id)?.role === "admin");
  const otherPrivateMember = selectedConversation?.type === "private" ? members.find((member) => member.id !== user.id) : null;
  const otherPrivateMemberBlocked = otherPrivateMember && blockedUsers.some((blocked) => blocked.id === otherPrivateMember.id);
  const hasJoinedSelectedGroup = selectedConversation?.type !== "book" || members.some((member) => member.id === user.id);
  const cannotSend = Boolean(otherPrivateMemberBlocked || !hasJoinedSelectedGroup);
  const togglePrivateBlock = async () => {
    if (!otherPrivateMember) return;
    if (otherPrivateMemberBlocked) {
      await api.delete(`/users/${otherPrivateMember.id}/block`);
      setNotice(`${otherPrivateMember.name} a été débloqué.`);
    } else {
      await api.post(`/users/${otherPrivateMember.id}/block`);
      setNotice(`${otherPrivateMember.name} a été bloqué.`);
    }
    await loadBlockedUsers();
  };
  return <section className="container-page py-8"><div className="grid min-h-[70vh] overflow-hidden rounded-[2rem] border bg-white shadow-soft lg:grid-cols-[330px_1fr]">
    <aside className="border-r"><div className="flex items-center justify-between border-b p-5"><h1 className="text-xl font-bold">Conversations</h1><button onClick={() => setGroupOpen(true)} className="rounded-xl bg-neutral-950 p-2 text-white" title="Créer un groupe privé"><Plus size={18} /></button></div><div className="max-h-[65vh] overflow-y-auto">{conversations.map((conversation) => <button key={conversation.id} onClick={() => setSelected(conversation.id)} className={`flex w-full gap-3 border-b p-4 text-left ${selected === conversation.id ? "bg-neutral-100" : "hover:bg-neutral-50"}`}>{conversation.display_image ? <img src={assetUrl(conversation.display_image)} className="size-12 rounded-full object-cover" alt="" /> : <span className="grid size-12 place-items-center rounded-full bg-neutral-200"><Users size={20} /></span>}<div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate font-bold">{conversation.display_name || "Conversation"}</p>{conversation.type === "book" && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">PUBLIC</span>}</div><p className="truncate text-xs text-neutral-500">{conversation.last_message || "Aucun message"}</p>{conversation.last_message_at && <time className="mt-1 block text-[10px] text-neutral-400">{new Date(conversation.last_message_at).toLocaleString("fr")}</time>}</div></button>)}</div></aside>
    <main className="flex min-w-0 flex-col">{!selected ? <div className="grid flex-1 place-items-center text-neutral-400">Choisissez une conversation.</div> : <><div className="flex items-center justify-between border-b p-4"><div><div className="flex items-center gap-2"><strong>{selectedConversation?.display_name}</strong>{otherPrivateMemberBlocked && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-700">Bloqué</span>}</div><p className="text-xs text-neutral-400">{members.length} membre(s)</p></div><div className="flex gap-2">{selectedConversation?.type === "book" && !hasJoinedSelectedGroup && <button onClick={async () => { await api.post(`/conversations/${selected}/join`); await loadMembers(); setNotice("Vous avez rejoint le salon. Vous pouvez maintenant participer."); }} className="btn-dark px-4 py-2"><UserPlus size={16}/>Rejoindre</button>}{otherPrivateMember && <button onClick={togglePrivateBlock} className={`btn px-4 py-2 ${otherPrivateMemberBlocked ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-red-50 text-red-600 hover:bg-red-100"}`} title={otherPrivateMemberBlocked ? "Débloquer cet utilisateur" : "Bloquer cet utilisateur"}><Ban size={16}/>{otherPrivateMemberBlocked ? "Débloquer" : "Bloquer"}</button>}{canManage && <><button onClick={() => { setGroup({ name: selectedConversation.display_name, book_id: "", image: null }); setGroupEditOpen(true); }} className="rounded-xl border p-2"><Settings size={17}/></button><button onClick={() => setDeleteGroup(true)} className="rounded-xl bg-red-50 p-2 text-red-600"><Trash2 size={17}/></button></>}</div></div>{notice && <button onClick={() => setNotice("")} className="border-b bg-emerald-50 p-3 text-left text-sm text-emerald-700">{notice}</button>}{otherPrivateMemberBlocked && <div className="border-b bg-red-50 p-3 text-center text-sm text-red-700">Vous avez bloqué cet utilisateur. Débloquez-le pour pouvoir lui envoyer de nouveaux messages.</div>}{!hasJoinedSelectedGroup && <div className="border-b bg-amber-50 p-3 text-center text-sm text-amber-800">Vous pouvez consulter les messages, mais vous devez rejoindre ce salon pour écrire ou envoyer un audio.</div>}<div className="flex-1 space-y-3 overflow-y-auto bg-[#f7f7f5] p-5">{messages.map((message) => <div key={message.id} className={`flex ${message.user_id === user.id ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl p-4 text-sm shadow-sm ${message.user_id === user.id ? "bg-neutral-950 text-white" : "bg-white"}`}><Link to={`/users/${message.user_id}`} className="text-xs font-bold opacity-60">{message.user_name}</Link>{message.text && <p className="mt-1 whitespace-pre-wrap">{message.text}</p>}{message.audio_url && <audio controls preload="metadata" className="mt-2 max-w-full" src={assetUrl(message.audio_url)} /> }<div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-50"><Clock3 size={10}/><time>{new Date(message.created_at).toLocaleString("fr")}</time>{message.is_edited ? <span>· modifié {new Date(message.updated_at).toLocaleString("fr")}</span> : null}</div>{message.user_id === user.id && <div className="mt-2 flex justify-end gap-2">{message.text && !message.audio_url && <button onClick={() => { setEditing(message.id); setText(message.text || ""); }}><Edit3 size={13} /></button>}<button onClick={() => setDeleteId(message.id)}><Trash2 size={13} /></button></div>}</div></div>)}</div>{audio && !editing && <div className="flex items-center gap-3 border-t bg-emerald-50 p-3"><audio controls className="h-10 flex-1" src={URL.createObjectURL(audio)} /><button type="button" onClick={() => setAudio(null)} className="rounded-full p-2 text-red-600"><X size={17}/></button></div>}<form onSubmit={send} className="flex items-center gap-2 border-t p-4">{!editing && <button disabled={cannotSend} type="button" onClick={toggleRecord} className={`rounded-full p-3 ${recording ? "animate-pulse bg-red-600 text-white" : "bg-neutral-100"} disabled:cursor-not-allowed disabled:opacity-40`}><Mic size={18} /></button>}<input disabled={cannotSend} className="input" value={text} onChange={(event) => setText(event.target.value)} placeholder={!hasJoinedSelectedGroup ? "Rejoignez le salon pour participer" : otherPrivateMemberBlocked ? "Utilisateur bloqué" : editing ? "Modifier le message texte…" : audio ? "Ajoutez éventuellement un texte…" : "Écrire un message…"} />{editing && <button type="button" onClick={() => { setEditing(null); setText(""); }} className="rounded-full bg-neutral-100 p-3"><X size={18}/></button>}<button disabled={cannotSend} className="btn-dark"><Send size={17} /></button></form></>}</main>
  </div>
  {groupOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"><form onSubmit={createGroup} className="card max-h-[92vh] w-full max-w-lg overflow-y-auto p-7"><h2 className="display text-3xl">Créer un groupe</h2><p className="mt-2 text-sm text-neutral-500">{user.role === "admin" ? "Créez un groupe privé ou associez-le à un livre pour ouvrir un salon public." : "Créez un groupe privé et ajoutez les membres de votre choix."}</p><input className="input mt-5" required placeholder="Nom du groupe" value={group.name} onChange={(event) => setGroup({ ...group, name: event.target.value })} />{user.role === "admin" && <select className="input mt-3" value={group.book_id} onChange={(event) => { const book = books.find((item) => item.id === Number(event.target.value)); setGroup({ ...group, book_id: event.target.value, name: group.name || (book ? `Club de lecture · ${book.title}` : "") }); }}><option value="">Groupe privé — aucun livre</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select>}<UserSelector users={users} search={userSearch} onSearch={setUserSearch} selected={group.member_ids} onToggle={(id) => setGroup((current) => ({ ...current, member_ids: current.member_ids.includes(id) ? current.member_ids.filter((value) => value !== id) : [...current.member_ids, id] }))} /><label className="mt-4 block rounded-2xl border border-dashed p-4 text-sm text-neutral-500">Photo du groupe<input className="mt-2 block w-full" type="file" accept="image/*" onChange={(event) => setGroup({ ...group, image: event.target.files[0] })} /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setGroupOpen(false)} className="btn-light">Annuler</button><button className="btn-dark">Créer avec {group.member_ids.length} membre(s)</button></div></form></div>}
  {groupEditOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"><div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-7"><form onSubmit={editGroup}><h2 className="display text-3xl">Gérer le groupe</h2><input className="input mt-5" required value={group.name} onChange={(event) => setGroup({ ...group, name: event.target.value })}/><input className="mt-4" type="file" accept="image/*" onChange={(event) => setGroup({ ...group, image: event.target.files[0] })}/><button className="btn-dark mt-4">Enregistrer le nom et la photo</button></form><div className="mt-6 border-t pt-5"><h3 className="font-bold">Ajouter un membre</h3><UserSelector users={users.filter((candidate) => !members.some((member) => member.id === candidate.id))} search={userSearch} onSearch={setUserSearch} onAdd={async (candidate) => { await api.post(`/conversations/${selected}/members/${candidate.id}`); await loadMembers(); }} /><h3 className="mt-6 font-bold">Membres actuels</h3><div className="mt-3 space-y-2">{members.map((member) => <div key={member.id} className="flex items-center gap-3 rounded-xl bg-neutral-100 p-3">{member.avatar_url ? <img src={assetUrl(member.avatar_url)} className="size-10 rounded-xl object-cover" alt="" /> : <span className="grid size-10 place-items-center rounded-xl bg-white"><Users size={17}/></span>}<span className="flex-1 font-semibold">{member.name} <small className="block text-xs font-normal text-neutral-400">{member.role}</small></span>{member.id !== user.id && <><button onClick={async () => { await api.delete(`/conversations/${selected}/members/${member.id}`); loadMembers(); }} className="rounded-lg p-2 text-neutral-600" title="Retirer"><X size={15}/></button><button onClick={async () => { await api.post(`/conversations/${selected}/ban/${member.id}`); loadMembers(); }} className="rounded-lg bg-red-50 p-2 text-red-600" title="Bannir"><Ban size={15}/></button></>}</div>)}</div></div><div className="mt-6 flex justify-end"><button onClick={() => setGroupEditOpen(false)} className="btn-light">Fermer</button></div></div></div>}
  <ConfirmDialog open={Boolean(deleteId)} title="Supprimer le message ?" message="Cette action est définitive." danger onCancel={() => setDeleteId(null)} onConfirm={async () => { await api.delete(`/messages/${deleteId}`); setDeleteId(null); loadMessages(); }} />
  <ConfirmDialog open={deleteGroup} title="Supprimer le groupe ?" message="Tous les messages du groupe seront supprimés." danger onCancel={() => setDeleteGroup(false)} onConfirm={async () => { await api.delete(`/conversations/${selected}`); setDeleteGroup(false); setSelected(null); loadConversations(); }} />
  </section>;
}

function UserSelector({ users, search, onSearch, selected = [], onToggle, onAdd }) {
  const normalized = search.trim().toLowerCase();
  const filtered = users.filter((candidate) => `${candidate.name} ${candidate.email}`.toLowerCase().includes(normalized));
  return <div className="mt-4 rounded-2xl border p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Choisir les membres</p><p className="text-xs text-neutral-400">{selected.length ? `${selected.length} sélectionné(s)` : "Recherchez par nom ou e-mail"}</p></div><Users size={18} className="text-neutral-400" /></div><input className="input mt-3" placeholder="Rechercher un utilisateur…" value={search} onChange={(event) => onSearch(event.target.value)} /><div className="mt-3 max-h-56 space-y-2 overflow-y-auto">{filtered.length ? filtered.map((candidate) => {
    const isSelected = selected.includes(candidate.id);
    return <button type="button" key={candidate.id} onClick={() => onAdd ? onAdd(candidate) : onToggle(candidate.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${isSelected ? "border-neutral-950 bg-neutral-950 text-white" : "bg-neutral-50 hover:border-neutral-400"}`}>{candidate.avatar_url ? <img src={assetUrl(candidate.avatar_url)} className="size-10 rounded-xl object-cover" alt="" /> : <span className={`grid size-10 place-items-center rounded-xl ${isSelected ? "bg-white/15" : "bg-white"}`}><Users size={17}/></span>}<span className="min-w-0 flex-1"><strong className="block truncate text-sm">{candidate.name}</strong><small className={`block truncate ${isSelected ? "text-neutral-300" : "text-neutral-400"}`}>{candidate.email}</small></span>{onAdd ? <UserPlus size={17}/> : <span className={`grid size-5 place-items-center rounded-full border text-xs ${isSelected ? "border-white bg-white text-black" : ""}`}>{isSelected ? "✓" : ""}</span>}</button>;
  }) : <p className="p-5 text-center text-sm text-neutral-400">Aucun utilisateur trouvé.</p>}</div></div>;
}
