import { useState } from "react";
import { BookOpen, Bot, Heart, Library, LogIn, LogOut, Menu, MessageCircle, Shield, Trophy, User, X } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { assetUrl } from "../lib/assets";
import NotificationBell from "./NotificationBell";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const links = [["/books", t("library"), Library], ["/ranking", t("ranking"), Trophy], ["/chat", t("adviser"), Bot]];
  const navClass = ({ isActive }) => `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${isActive ? "bg-neutral-950 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-black"}`;
  const profileIcon = user?.avatar_url ? <img src={assetUrl(user.avatar_url)} className="size-6 rounded-full object-cover" alt="" /> : <User size={16} />;
  return <div className="min-h-screen">
    <header className="sticky top-0 z-50 border-b bg-[#f7f7f5]/90 backdrop-blur-xl">
      <div className="container-page flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 font-extrabold tracking-tight"><span className="grid size-10 place-items-center rounded-xl bg-neutral-950 text-white"><BookOpen size={21} /></span><span>SMART LIBRARY <span className="text-neutral-400">AI</span></span></Link>
        <nav className="hidden items-center gap-1 lg:flex">{links.map(([to,label,Icon]) => <NavLink key={to} to={to} className={navClass}><Icon size={16} />{label}</NavLink>)}{user && <NavLink to="/favorites" className={navClass}><Heart size={16} />{t("favorites")}</NavLink>}{user?.role === "admin" && <NavLink to="/admin" className={navClass}><Shield size={16} />{t("admin")}</NavLink>}</nav>
        <div className="hidden items-center gap-2 lg:flex">{user ? <><Link to="/messages" className="rounded-full border bg-white p-3"><MessageCircle size={18} /></Link><NotificationBell/><Link to="/profile" className="btn-light">{profileIcon}{user.name.split(" ")[0]}</Link><button onClick={logout} className="btn-dark"><LogOut size={16} />{t("logout")}</button></> : <Link to="/login" className="btn-dark"><LogIn size={16} />{t("login")}</Link>}</div>
        <button className="rounded-xl p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && <nav className="container-page flex flex-col gap-2 border-t py-4 lg:hidden">
        {links.map(([to,label,Icon]) => <NavLink onClick={() => setOpen(false)} key={to} to={to} className={navClass}><Icon size={16} />{label}</NavLink>)}
        {user && <NavLink onClick={() => setOpen(false)} to="/favorites" className={navClass}><Heart size={16} />{t("favorites")}</NavLink>}
        {user && <NavLink onClick={() => setOpen(false)} to="/messages" className={navClass}><MessageCircle size={16} />Messages</NavLink>}
        {user?.role === "admin" && <NavLink onClick={() => setOpen(false)} to="/admin" className={navClass}><Shield size={16} />{t("admin")}</NavLink>}
        {user ? <><NavLink onClick={() => setOpen(false)} to="/profile" className={navClass}>{profileIcon}{t("profile")}</NavLink><button onClick={() => { logout(); setOpen(false); }} className="btn-dark"><LogOut size={16} />{t("logout")}</button></> : <Link onClick={() => setOpen(false)} to="/login" className="btn-dark"><LogIn size={16} />{t("login")}</Link>}
      </nav>}
    </header>
    <main><Outlet /></main>
    <footer className="mt-20 border-t bg-neutral-950 py-12 text-white"><div className="container-page flex flex-col justify-between gap-6 sm:flex-row"><div><div className="flex items-center gap-2 font-bold"><BookOpen /> Smart Library AI</div><p className="mt-3 max-w-md text-sm text-neutral-400">Project Gutenberg × Mistral AI</p></div><p className="text-sm text-neutral-500">PFA · {new Date().getFullYear()}</p></div></footer>
  </div>;
}
