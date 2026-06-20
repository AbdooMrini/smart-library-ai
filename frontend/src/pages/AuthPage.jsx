import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const registerMode = useLocation().pathname === "/register";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" }), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try { await (registerMode ? register(form) : login(form)); navigate("/books"); } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return <section className="container-page grid min-h-[75vh] place-items-center py-14"><div className="card w-full max-w-md p-8 sm:p-10"><BookOpen className="mb-7"/><h1 className="display text-4xl">{registerMode ? "Créer votre compte" : "Heureux de vous revoir."}</h1><p className="mt-3 text-sm text-neutral-500">{registerMode ? "Commencez votre parcours de lecture." : "Connectez-vous pour retrouver votre bibliothèque."}</p>{error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-7 space-y-4">{registerMode && <input className="input" placeholder="Nom complet" required value={form.name} onChange={(e) => setForm({...form, name:e.target.value})}/>}<input type="email" className="input" placeholder="Email" required value={form.email} onChange={(e) => setForm({...form, email:e.target.value})}/><input type="password" className="input" placeholder="Mot de passe" required minLength={6} value={form.password} onChange={(e) => setForm({...form, password:e.target.value})}/><button disabled={loading} className="btn-dark w-full">{loading ? "Patientez…" : registerMode ? "S’inscrire" : "Se connecter"}</button></form><p className="mt-6 text-center text-sm text-neutral-500">{registerMode ? "Déjà inscrit ?" : "Nouveau ici ?"} <Link className="font-bold text-black underline" to={registerMode ? "/login" : "/register"}>{registerMode ? "Connexion" : "Créer un compte"}</Link></p></div></section>;
}
