import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { Check, Cloud, Eye, EyeOff, X } from "lucide-react";

export default function AuthModal() {
  const { modal, setModal, login, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const firstField = useRef(null);
  const isRegister = modal === "register";

  useEffect(() => {
    if (!modal) return;
    setError("");
    const t = setTimeout(() => firstField.current?.focus(), 30);
    const esc = (e) => { if (e.key === "Escape") setModal(null); };
    document.addEventListener("keydown", esc);
    return () => { clearTimeout(t); document.removeEventListener("keydown", esc); };
  }, [modal, setModal]);

  if (!modal) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
      <div className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><X size={18} /></button>
        <div className="auth-art" aria-hidden>
          <Cloud size={46} strokeWidth={1.6} />
          <p>Your progress, everywhere.</p>
          <ul>
            <li><Check size={16} /> Scores saved across devices</li>
            <li><Check size={16} /> Full attempt history</li>
            <li><Check size={16} /> Weak-area insights</li>
          </ul>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <h2 id="auth-title">{isRegister ? "Create your account" : "Welcome back"}</h2>
          <p className="auth-sub">
            {isRegister ? "Free — and your existing guest scores come with you." : "Sign in to sync your scores and history."}
          </p>

          {isRegister && (
            <label className="field">
              <span>Name</span>
              <input ref={firstField} value={form.name} onChange={set("name")} autoComplete="name" maxLength={60} required />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input ref={isRegister ? undefined : firstField} type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="field-pw">
              <input
                type={show ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 8 : undefined}
                required
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isRegister && <small>At least 8 characters.</small>}
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </button>
          <p className="auth-switch">
            {isRegister ? "Already have an account?" : "New here?"}{" "}
            <button type="button" onClick={() => { setError(""); setModal(isRegister ? "login" : "register"); }}>
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
