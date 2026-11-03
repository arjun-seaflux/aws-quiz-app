import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import Dialog from "../components/Dialog.jsx";
import NotFound from "./NotFound.jsx";

export default function Admin() {
  const { user, ready } = useAuth();
  const [status, setStatus] = useState("open");
  const [reports, setReports] = useState(null);
  const [edit, setEdit] = useState(null); // { key, json, error, busy }

  const load = useCallback(() => api.get(`/admin/reports?status=${status}`).then((d) => setReports(d.reports)).catch(() => setReports([])), [status]);
  useEffect(() => { if (user?.isAdmin) load(); }, [user, load]);

  if (!ready) return <div className="loading-block"><span className="spinner" /></div>;
  if (!user?.isAdmin) return <NotFound />;

  const resolve = async (id, s) => { await api.post("/admin/reports", { id, status: s }); load(); };
  const openEditor = async (key) => {
    try {
      const { question } = await api.get(`/admin/question?key=${key}`);
      setEdit({ key, json: JSON.stringify(question, null, 2) });
    } catch (e) { setEdit({ key, json: "", error: e.message }); }
  };
  const save = async () => {
    let data;
    try { data = JSON.parse(edit.json); } catch { return setEdit({ ...edit, error: "That isn't valid JSON." }); }
    setEdit({ ...edit, busy: true, error: null });
    try { await api.post("/admin/question", { key: edit.key, data }); setEdit(null); }
    catch (e) { setEdit({ ...edit, busy: false, error: e.message }); }
  };

  return (
    <div>
      <header className="page-head">
        <div><h1>Admin</h1><p className="muted">Question reports from learners. Edits take effect immediately.</p></div>
        <div className="mode-switch">
          {["open", "all"].map((s) => <button key={s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{s === "open" ? "Open" : "All"}</button>)}
        </div>
      </header>
      {!reports ? <div className="loading-block"><span className="spinner" /></div> : reports.length === 0 ? (
        <div className="empty-state card"><p>No reports.</p></div>
      ) : (
        <ul className="mistake-list">
          {reports.map((r) => (
            <li key={r.id} className="card mistake">
              <div className="admin-row">
                <span className="pill">{r.src_paper}:{r.src_pos}</span>
                <span className={`pill pill--${r.status === "open" ? "retry" : "passed"}`}>{r.status}</span>
                <span className="muted small">{r.email ?? "deleted user"} · {new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="muted">“{(r.text ?? "").slice(0, 200)}{(r.text ?? "").length > 200 ? "…" : ""}”</p>
              <p><strong>{r.message}</strong></p>
              <div className="ra">
                <button className="ra-btn" onClick={() => openEditor(`${r.src_paper}:${r.src_pos}`)}><Pencil size={14} /> Edit question</button>
                {r.status === "open" && <>
                  <button className="ra-btn" onClick={() => resolve(r.id, "resolved")}><Check size={14} /> Resolve</button>
                  <button className="ra-btn" onClick={() => resolve(r.id, "dismissed")}><X size={14} /> Dismiss</button>
                </>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={`Edit question ${edit?.key ?? ""}`} icon={Pencil}
        actions={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={edit?.busy}>Save</button></>}>
        <textarea className="textarea mono" rows={14} spellCheck={false} value={edit?.json ?? ""} onChange={(e) => setEdit({ ...edit, json: e.target.value })} />
        {edit?.error && <p className="auth-error">{edit.error}</p>}
      </Dialog>
    </div>
  );
}
