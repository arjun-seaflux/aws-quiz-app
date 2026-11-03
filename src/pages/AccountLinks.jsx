import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, MailCheck, XCircle } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";

function Shell({ icon: Icon, title, children }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={40} /></div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState(""); const [state, setState] = useState("idle"); const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setState("busy"); setErr("");
    try { await api.post("/auth/forgot", { email }); setState("sent"); } catch (x) { setErr(x.message); setState("idle"); }
  };
  if (state === "sent")
    return <Shell icon={MailCheck} title="Check your inbox"><p>If an account exists for <strong>{email}</strong>, a reset link is on its way. It expires in 60 minutes.</p><Link className="btn btn-primary" to="/">Back home</Link></Shell>;
  return (
    <Shell icon={KeyRound} title="Forgot your password?">
      <p>Enter your email and we'll send you a link to choose a new one.</p>
      <form className="narrow-form" onSubmit={submit}>
        <label className="field"><span>Email</span><input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        {err && <div className="auth-error">{err}</div>}
        <button className="btn btn-primary btn-block" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Send reset link"}</button>
      </form>
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams(); const token = params.get("token");
  const [pw, setPw] = useState(""); const [state, setState] = useState("idle"); const [err, setErr] = useState("");
  const { setModal } = useAuth();
  const submit = async (e) => {
    e.preventDefault(); setState("busy"); setErr("");
    try { await api.post("/auth/reset", { token, password: pw }); setState("done"); } catch (x) { setErr(x.message); setState("idle"); }
  };
  if (!token) return <Shell icon={XCircle} title="Invalid link"><p>This reset link is missing its token.</p><Link className="btn btn-primary" to="/forgot">Request a new one</Link></Shell>;
  if (state === "done")
    return <Shell icon={CheckCircle2} title="Password updated"><p>You can now sign in with your new password.</p><button className="btn btn-primary" onClick={() => setModal("login")}>Sign in</button></Shell>;
  return (
    <Shell icon={KeyRound} title="Choose a new password">
      <form className="narrow-form" onSubmit={submit}>
        <label className="field"><span>New password</span><input type="password" required minLength={8} maxLength={72} autoFocus value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /><small>At least 8 characters.</small></label>
        {err && <div className="auth-error">{err} <Link to="/forgot">Request a new link</Link></div>}
        <button className="btn btn-primary btn-block" disabled={state === "busy"}>{state === "busy" ? "Saving…" : "Update password"}</button>
      </form>
    </Shell>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams(); const token = params.get("token");
  const { refresh } = useAuth();
  const [state, setState] = useState(token ? "busy" : "bad");
  useEffect(() => {
    if (!token) return;
    api.post("/auth/verify", { token }).then(() => { setState("ok"); refresh(); }).catch(() => setState("bad"));
  }, [token, refresh]);
  if (state === "busy") return <div className="loading-block"><span className="spinner" /> Verifying…</div>;
  return state === "ok"
    ? <Shell icon={CheckCircle2} title="Email verified"><p>Thanks — your email address is confirmed.</p><Link className="btn btn-primary" to="/">Continue</Link></Shell>
    : <Shell icon={XCircle} title="Link expired"><p>This verification link is invalid or has expired. Sign in and request a new one from the banner at the top.</p><Link className="btn btn-primary" to="/">Home</Link></Shell>;
}
