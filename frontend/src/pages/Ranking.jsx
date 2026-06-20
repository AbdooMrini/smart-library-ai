import { useEffect, useState } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import api from "../lib/api";
import { Loader, State } from "../components/UI";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { assetUrl } from "../lib/assets";
import { Link } from "react-router-dom";

export default function Ranking() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState(null);
  useEffect(() => { api.get("/rank/weekly").then((response) => setUsers(response.data)).catch(() => setUsers([])); }, []);
  return <section className="container-page py-14">
    <h1 className="display mt-3 text-5xl sm:text-7xl">{t("weeklyRanking")}</h1>
    <div className="mt-6 max-w-2xl rounded-2xl border bg-white p-5 text-sm leading-6 text-neutral-600">{t("howWorks")}</div>
    {!users ? <Loader /> : users.length === 0 ? <div className="mt-10"><State title="Classement vide" text="Répondez à un QCM pour gagner les premiers points." /></div> :
      <div className="mx-auto mt-10 max-w-3xl space-y-3">{users.map((reader, index) => {
        const isMe = user?.id === reader.id;
        return <div key={reader.id} className={`flex items-center gap-5 rounded-3xl border p-5 ${index === 0 ? "bg-neutral-950 text-white" : isMe ? "border-neutral-950 bg-neutral-100" : "bg-white"}`}>
          {reader.avatar_url ? <img src={assetUrl(reader.avatar_url)} className="size-12 shrink-0 rounded-full border object-cover" alt="" /> : <span className="grid size-12 shrink-0 place-items-center rounded-full border text-lg font-extrabold">{index === 0 ? <Crown /> : index === 1 || index === 2 ? <Medal /> : index + 1}</span>}
          <div className="min-w-0 flex-1"><Link to={`/users/${reader.id}`} className="block truncate font-bold hover:underline">#{index + 1} · {reader.name}</Link><p className={`text-sm ${index === 0 ? "text-neutral-400" : "text-neutral-500"}`}>{t("totalScore")} : {reader.score}</p></div>
          <div className="text-right"><p className="flex items-center justify-end gap-2 text-xl font-extrabold"><Trophy size={18} />{reader.weekly_score}</p><p className={`text-xs ${index === 0 ? "text-neutral-400" : "text-neutral-500"}`}>{t("weeklyPoints")}</p></div>
        </div>;
      })}</div>}
  </section>;
}
