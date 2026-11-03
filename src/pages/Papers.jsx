import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock, FilePlus2, ListChecks, UserRound } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";

export const STATUS_LABEL = { private: "Private", pending: "Awaiting approval", approved: "Public", rejected: "Needs changes" };
export const statusClass = (s) => (s === "approved" ? "pill--passed" : s === "pending" || s === "rejected" ? "pill--retry" : "");
export const minutesFor = (n) => Math.max(10, n * 2);

function PaperCard({ p, mine }) {
  return (
    <Link to={`/papers/${p.id}`} className="paper-card">
      <div className="paper-card-top">
        <span className="paper-num"><ListChecks size={22} /></span>
        {mine && <span className={`pill ${statusClass(p.status)}`}>{STATUS_LABEL[p.status]}</span>}
      </div>
      <h3>{p.title}</h3>
      {p.description && <p className="muted clamp-2">{p.description}</p>}
      <p className="muted small">
        <ListChecks size={13} /> {p.questionCount} questions · <Clock size={13} /> {minutesFor(p.questionCount)} min · <UserRound size={13} /> {p.author}
      </p>
      {mine && p.status === "rejected" && p.reviewNote && <p className="auth-error small">{p.reviewNote}</p>}
      <span className="paper-go">Open <ArrowRight size={14} /></span>
    </Link>
  );
}

export default function Papers() {
  const { user, ready, setModal } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("community");
  const [community, setCommunity] = useState(null);
  const [mine, setMine] = useState(null);

  useEffect(() => { api.get("/community").then((d) => setCommunity(d.papers)).catch(() => setCommunity([])); }, []);
  useEffect(() => {
    if (user) api.get("/community?mine=1").then((d) => setMine(d.papers)).catch(() => setMine([]));
  }, [user]);

  const create = () => (user ? navigate("/papers/new") : setModal("login"));
  const list = tab === "community" ? community : mine;

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Papers</h1>
          <p className="muted">Practice papers made by the community. Build your own — at least 20 questions — and an admin can publish it for everyone.</p>
        </div>
        <button className="btn btn-primary" onClick={create}><FilePlus2 size={18} /> Create a paper</button>
      </header>

      <div className="mode-switch" role="tablist">
        <button role="tab" aria-selected={tab === "community"} className={tab === "community" ? "on" : ""} onClick={() => setTab("community")}>Community papers</button>
        <button role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => (user ? setTab("mine") : setModal("login"))}>My papers</button>
      </div>

      {tab === "mine" && ready && !user ? null : !list ? (
        <div className="loading-block"><span className="spinner" /></div>
      ) : list.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><FilePlus2 size={40} /></div>
          <h2>{tab === "community" ? "No community papers yet" : "You haven't made a paper yet"}</h2>
          <p>{tab === "community"
            ? "Papers appear here once an admin approves them. Be the first to build one."
            : "Pick questions from the bank and add your own. Your paper stays private until you submit it for approval."}</p>
          <button className="btn btn-primary" onClick={create}><FilePlus2 size={16} /> Create a paper</button>
        </div>
      ) : (
        <div className="paper-grid">{list.map((p) => <PaperCard key={p.id} p={p} mine={tab === "mine"} />)}</div>
      )}
    </div>
  );
}
