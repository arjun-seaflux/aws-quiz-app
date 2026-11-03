import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Dices, FilePlus2, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";
import { useNotes } from "../hooks/useNotes.js";
import QuestionForm from "../components/QuestionForm.jsx";

const MIN = 20, MAX = 100;
const DOMAINS = ["Development with AWS Services", "Security", "Deployment", "Troubleshooting and Optimization"];
const clip = (t, n = 140) => (t.length > n ? `${t.slice(0, n)}…` : t).replace(/<[^>]+>/g, " ");
let uid = 0;

export default function PaperBuilder() {
  const { id } = useParams();
  const editing = !!id;
  const { user, ready, setModal } = useAuth();
  const navigate = useNavigate();
  const topics = useNotes();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState([]);                // { uid, key?, question?, text, authored }
  const [loaded, setLoaded] = useState(!editing);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({ q: "", domain: "", topic: "" });
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Load an existing paper for editing.
  useEffect(() => {
    if (!editing || !user) return;
    api.get(`/community/${id}`).then((d) => {
      if (!d.paper.isOwner || !["private", "rejected"].includes(d.paper.status)) { setLoadError("This paper can't be edited right now."); return; }
      setTitle(d.paper.title); setDescription(d.paper.description);
      setItems(d.questions.map((q) => ({ uid: ++uid, key: q._key, text: q.text, authored: Number(q._key.split(":")[0]) >= 10000 })));
      setLoaded(true);
    }).catch((e) => setLoadError(e.message));
  }, [editing, id, user]);

  const keysInPaper = useMemo(() => new Set(items.map((i) => i.key).filter(Boolean)), [items]);

  const search = useCallback(async (extra = {}) => {
    setSearching(true);
    const p = new URLSearchParams({ limit: "30", ...Object.fromEntries(Object.entries({ ...filters, ...extra }).filter(([, v]) => v)) });
    try { setResults((await api.get(`/community/bank?${p}`)).questions); } catch { setResults([]); }
    setSearching(false);
  }, [filters]);
  useEffect(() => { if (user) search(); /* first page of the bank */ }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div className="loading-block"><span className="spinner" /></div>;
  if (!user)
    return (
      <div className="empty-state">
        <div className="empty-icon"><FilePlus2 size={40} /></div>
        <h1>Create a paper</h1><p>Sign in to build your own practice paper.</p>
        <button className="btn btn-primary" onClick={() => setModal("login")}>Sign in</button>
      </div>
    );
  if (loadError) return <div className="empty-state"><p>{loadError}</p><Link className="btn btn-primary" to="/papers">Back to papers</Link></div>;
  if (!loaded) return <div className="loading-block"><span className="spinner" /></div>;

  const addBank = (q) => { if (items.length < MAX && !keysInPaper.has(q._key)) setItems((l) => [...l, { uid: ++uid, key: q._key, text: q.text, authored: false }]); };
  const addRandom = async () => {
    const need = Math.min(10, MAX - items.length);
    if (need <= 0) return;
    const p = new URLSearchParams({ random: String(need + 10), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) });
    const { questions } = await api.get(`/community/bank?${p}`);
    const fresh = questions.filter((q) => !keysInPaper.has(q._key)).slice(0, need);
    setItems((l) => [...l, ...fresh.map((q) => ({ uid: ++uid, key: q._key, text: q.text, authored: false }))]);
  };
  const addWritten = (question) => setItems((l) => (l.length >= MAX ? l : [...l, { uid: ++uid, question, text: question.text, authored: true }]));
  const remove = (u) => setItems((l) => l.filter((i) => i.uid !== u));
  const move = (idx, d) => setItems((l) => { const n = [...l]; const j = idx + d; if (j < 0 || j >= n.length) return l; [n[idx], n[j]] = [n[j], n[idx]]; return n; });

  const count = items.length;
  const ready20 = count >= MIN;
  const save = async () => {
    setSaving(true); setError("");
    const body = { title, description, items: items.map((i) => (i.key ? { key: i.key } : { question: i.question })) };
    try {
      if (editing) { await api.post(`/community/${id}`, { action: "update", ...body }); navigate(`/papers/${id}`); }
      else { const { id: newId } = await api.post("/community", body); navigate(`/papers/${newId}`); }
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <div>
      <Link to={editing ? `/papers/${id}` : "/papers"} className="back-link"><ArrowLeft size={16} /> Back</Link>
      <header className="page-head">
        <div>
          <h1>{editing ? "Edit paper" : "Create a paper"}</h1>
          <p className="muted">Choose at least {MIN} questions from the bank and/or write your own. It starts private; submit it when you want an admin to publish it.</p>
        </div>
      </header>

      <div className="builder">
        <section className="card builder-main">
          <label className="field"><span>Title</span>
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lambda & DynamoDB deep dive" /></label>
          <label className="field"><span>Description <small>(optional)</small></span>
            <textarea className="textarea" rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} /></label>

          <div className="builder-count">
            <div className="bar" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={MIN}>
              <div className={`bar-fill ${ready20 ? "good" : ""}`} style={{ width: `${Math.min(100, (count / MIN) * 100)}%` }} />
            </div>
            <strong className={ready20 ? "ok" : ""}>{ready20 ? <><Check size={15} /> {count} questions</> : `${count} / ${MIN} minimum`}</strong>
          </div>

          {items.length === 0 ? <p className="muted">No questions yet — add some from the bank on the right, or write your own.</p> : (
            <ol className="builder-list">
              {items.map((it, idx) => (
                <li key={it.uid}>
                  <span className="builder-n">{idx + 1}</span>
                  <span className="builder-text">{clip(it.text)}{it.authored && <span className="tag">written</span>}</span>
                  <span className="builder-ops">
                    <button className="icon-btn" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up">↑</button>
                    <button className="icon-btn" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} aria-label="Move down">↓</button>
                    <button className="icon-btn" onClick={() => remove(it.uid)} aria-label="Remove question"><Trash2 size={15} /></button>
                  </span>
                </li>
              ))}
            </ol>
          )}

          {error && <div className="auth-error">{error}</div>}
          <div className="row-gap start">
            <button className="btn btn-primary btn-lg" disabled={!ready20 || title.trim().length < 3 || saving} onClick={save}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create paper"}
            </button>
            {(!ready20 || title.trim().length < 3) && (
              <span className="muted small">{title.trim().length < 3 ? "Add a title. " : ""}{!ready20 ? `${MIN - count} more question${MIN - count === 1 ? "" : "s"} needed.` : ""}</span>
            )}
          </div>
        </section>

        <aside className="card builder-bank">
          <h2 className="section-title">Add questions</h2>
          <div className="builder-tools">
            <button className="btn btn-sm" onClick={() => setFormOpen(true)}><PencilLine size={16} /> Write your own</button>
            <button className="btn btn-sm" onClick={addRandom} disabled={count >= MAX}><Dices size={16} /> Add 10 random</button>
          </div>
          <form className="builder-search" onSubmit={(e) => { e.preventDefault(); search(); }}>
            <div className="search"><Search size={16} /><input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search the question bank…" aria-label="Search questions" /></div>
            <div className="form-grid">
              <select className="select" value={filters.domain} onChange={(e) => setFilters({ ...filters, domain: e.target.value })} aria-label="Domain">
                <option value="">All domains</option>{DOMAINS.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select className="select" value={filters.topic} onChange={(e) => setFilters({ ...filters, topic: e.target.value })} aria-label="Topic">
                <option value="">All topics</option>{(topics ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <button className="btn btn-sm" disabled={searching}>{searching ? "Searching…" : "Search"}</button>
          </form>
          <ul className="bank-list">
            {(results ?? []).map((q) => {
              const added = keysInPaper.has(q._key);
              return (
                <li key={q._key}>
                  <span>{clip(q.text, 120)}</span>
                  <button className={`ra-btn ${added ? "on" : ""}`} disabled={added || count >= MAX} onClick={() => addBank(q)}>
                    {added ? <Check size={14} /> : <Plus size={14} />} {added ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
            {results && results.length === 0 && <li className="muted">No questions match.</li>}
          </ul>
        </aside>
      </div>

      <QuestionForm open={formOpen} onClose={() => setFormOpen(false)} onAdd={addWritten} />
    </div>
  );
}
