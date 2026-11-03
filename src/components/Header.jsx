import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logoImg from "../assets/quiz-logo.png";
import { useAuth } from "./AuthContext.jsx";
import { useTheme } from "./ThemeContext.jsx";
import { firstName } from "../utils/format.js";
import { Bookmark, ChevronDown, LayoutDashboard, LogOut, Moon, ShieldCheck, Sun, Trophy } from "lucide-react";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/notes", label: "Notes" },
  { to: "/practice", label: "Practice" },
  { to: "/papers", label: "Papers" },
  { to: "/review", label: "Review" },
  { to: "/compete", label: "Compete" },
  { to: "/dashboard", label: "Dashboard" },
];

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="um" ref={ref}>
      <button className="um-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="um-avatar">{user.name.trim()[0]?.toUpperCase()}</span>
        <span className="um-name">{firstName(user.name)}</span>
        <ChevronDown className="um-caret" size={15} aria-hidden />
      </button>
      {open && (
        <div className="um-menu" role="menu">
          <div className="um-who">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button role="menuitem" onClick={() => { setOpen(false); navigate("/dashboard"); }}><LayoutDashboard size={16} /> My dashboard</button>
          <button role="menuitem" onClick={() => { setOpen(false); navigate("/saved"); }}><Bookmark size={16} /> Saved</button>
          <button role="menuitem" onClick={() => { setOpen(false); navigate("/leaderboard"); }}><Trophy size={16} /> Leaderboard</button>
          {user.isAdmin && <button role="menuitem" onClick={() => { setOpen(false); navigate("/admin"); }}><ShieldCheck size={16} /> Admin</button>}
          <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }}><LogOut size={16} /> Sign out</button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, setModal, logout, ready } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="hd">
      <div className="hd-inner">
        <Link to="/" className="hd-brand">
          <img src={logoImg} alt="" />
          <span>
            <strong>AWS Quiz</strong>
            <small>DVA-C02 prep</small>
          </span>
        </Link>

        <nav className="hd-nav" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hd-actions">
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {ready && (user ? (
            <UserMenu user={user} onLogout={logout} />
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setModal("login")}>Sign in</button>
          ))}
        </div>
      </div>
    </header>
  );
}
