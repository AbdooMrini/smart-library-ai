import { useState } from "react";
import api from "../lib/api";

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirmer", danger = false, onCancel, onConfirm }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"><div className="card w-full max-w-md p-7"><h2 className="display text-3xl">{title}</h2><p className="mt-4 leading-7 text-neutral-600">{message}</p><div className="mt-7 flex justify-end gap-2"><button onClick={onCancel} className="btn-light">Annuler</button><button onClick={onConfirm} className={danger ? "btn bg-red-600 text-white hover:bg-red-700" : "btn-dark"}>{confirmLabel}</button></div></div></div>;
}

export function ReportDialog({ open, targetType, targetId, onClose }) {
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  if (!open) return null;
  const submit = async (event) => {
    event.preventDefault();
    try { setNotice((await api.post("/reports", { target_type: targetType, target_id: targetId, reason })).data.message); setTimeout(onClose, 800); }
    catch (error) { setNotice(error.message); }
  };
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"><form onSubmit={submit} className="card w-full max-w-md p-7"><h2 className="display text-3xl">Signaler</h2><p className="mt-3 text-sm text-neutral-500">Expliquez clairement le problème à l’équipe de modération.</p>{notice && <p className="mt-4 rounded-xl bg-neutral-100 p-3 text-sm">{notice}</p>}<textarea required className="input mt-5 min-h-32" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Raison du signalement…" /><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-light">Annuler</button><button className="btn-dark">Envoyer</button></div></form></div>;
}
