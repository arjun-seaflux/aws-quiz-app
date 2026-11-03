import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, FileCheck2, Flag, Pencil, X } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import Dialog from "../components/Dialog.jsx";
import NotFound from "./NotFound.jsx";
import RichText from "../components/RichText.jsx";

const PAPER_STATUS = { pending: "Awaiting approval", approved: "Public", rejected: "Sent back" };

/** Queue of community papers: review the questions, then approve or send back with a note. */
function PaperApprovals() {
  const [filter, setFilter] = useState("pending");
  const [papers, setPapers] = useState(null);
  const [open, setOpen] = useState(null);       // paper id being reviewed
  const [detail, setDetail] = useState(null);
  const [reject, setReject] = useState(null);   // { id, title, note, error }
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get(`/admin/papers?status=${filter}`).then((d) => setPapers(d.papers)).catch(() => setPapers([])), [filter]);
  useEffect(() => { setPapers(null); load(); }, [load]);

  const toggle = async (id) => {
    if (open === id) return setOpen(null);
    setOpen(id); setDetail(null);
    setDetail(await api.get(`/community/${id}`).catch(() => ({ questions: [] })));
  };
  const approve = async (id) => { setBusy(true); await api.post("/admin/papers", { id, action: "approve" }).catch(() => {}); setBusy(false); setOpen(null); load(); };
  const sendBack = async () => {
    setBusy(true);
    try { await api.post("/admin/papers", { id: reject.id, action: "reject", note: reject.note }); setReject(null); setOpen(null); load(); }
    catch (e) { setReject({ ...reject, error: e.message }); }
    setBusy(false);
  };

  return (
    <>
      <div className="mode-switch">
        {[["pending", "Pending"], ["approved", "Public"], ["rejected", "Sent back"]].map(([v, l]) => (
          <button key={v} className={filter === v ? "on" : ""} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {!papers ? <div className="loading-block"><span className="spinner" /></div> : papers.length === 0 ? (
        <div className="empty-state card"><div className="empty-icon"><FileCheck2 size={40} /></div><p>{filter === "pending" ? "Nothing waiting for review." : "No papers here."}</p></div>
      ) : (
        <ul className="mistake-list">
          {papers.map((p) => (
            <li key={p.id} className="card mistake">
              <div className="admin-row">
                <strong>{p.title}</strong>
                <span className={`pill ${p.status === "approved" ? "pill--passed" : "pill--retry"}`}>{PAPER_STATUS[p.status]}</span>
                <span className="muted small">{p.questionCount} questions · by {p.author} ({p.email})</span>
              </div>
              {p.description && <p className="muted">{p.description}</p>}
              {p.status === "rejected" && p.reviewNote && <p className="muted small">Note sent: “{p.reviewNote}”</p>}
              <div className="ra">
                <button className="ra-btn" onClick={() => toggle(p.id)}><ChevronDown size={14} /> {open === p.id ? "Hide questions" : "Review questions"}</button>
                {p.status !== "approved" && <button className="ra-btn" disabled={busy} onClick={() => approve(p.id)}><Check size={14} /> Approve &amp; publish</button>}
                {p.status !== "rejected" && <button className="ra-btn" disabled={busy} onClick={() => setReject({ id: p.id, title: p.title, note: "" })}><X size={14} /> {p.status === "approved" ? "Unpublish" : "Send back"}</button>}
              </div>
              {open === p.id && (
                <div className="mistake-body">
                  {!detail ? <span className="spinner" /> : (
                    <ol className="preview-list">
                      {detail.questions.map((q, i) => (
                        <li key={q._key}>
                          <span className="builder-n">{i + 1}</span>
                          <div>
                            <RichText text={q.text} />
                            <p className="muted small"><strong>Answer:</strong> {q.correctAnswerIndices.map((x) => q.answers[x]).join(" & ")}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!reject} onClose={() => setReject(null)} title={`Send “${reject?.title ?? ""}” back?`} icon={X} tone="warn"
        actions={<><button className="btn btn-ghost" onClick={() => setReject(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={sendBack} disabled={busy || (reject?.note ?? "").trim().length < 3}>Send back</button></>}>
        <p>Tell the author what to fix — they'll see this note and can resubmit.</p>
        <textarea className="textarea" rows={3} maxLength={300} autoFocus value={reject?.note ?? ""} onChange={(e) => setReject({ ...reject, note: e.target.value, error: null })} placeholder="e.g. Two questions have the wrong answer marked." />
        {reject?.error && <p className="auth-error">{reject.error}</p>}
      </Dialog>
    </>
  );
}

export default function Admin() {
  const { user, ready } = useAuth();
  const [tab, setTab] = useState("papers");
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
        <div><h1>Admin</h1><p className="muted">Approve community papers and handle question reports. Edits take effect immediately.</p></div>
      </header>
      <div className="mode-switch" role="tablist">
        <button role="tab" aria-selected={tab === "papers"} className={tab === "papers" ? "on" : ""} onClick={() => setTab("papers")}><FileCheck2 size={16} /> Paper approvals</button>
        <button role="tab" aria-selected={tab === "reports"} className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}><Flag size={16} /> Question reports</button>
      </div>
      {tab === "papers" ? <PaperApprovals /> : <>
      <div className="mode-switch">
        {["open", "all"].map((s) => <button key={s} className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{s === "open" ? "Open" : "All"}</button>)}
      </div>
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
      </>}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={`Edit question ${edit?.key ?? ""}`} icon={Pencil}
        actions={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={edit?.busy}>Save</button></>}>
        <textarea className="textarea mono" rows={14} spellCheck={false} value={edit?.json ?? ""} onChange={(e) => setEdit({ ...edit, json: e.target.value })} />
        {edit?.error && <p className="auth-error">{edit.error}</p>}
      </Dialog>
    </div>
  );
}
