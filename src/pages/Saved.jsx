import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Bookmark, Trash2 } from "lucide-react";
import { useAuth } from "../components/AuthContext.jsx";
import RichText from "../components/RichText.jsx";
import { useNotes } from "../hooks/useNotes.js";
import { useSaved } from "../hooks/useSaved.js";

function Comment({ item, onSave }) {
  const [v, setV] = useState(item.comment ?? "");
  return (
    <textarea className="textarea" rows={2} maxLength={500} value={v} placeholder="Add a personal note…"
      onChange={(e) => setV(e.target.value)} onBlur={() => v !== (item.comment ?? "") && onSave(v)} />
  );
}

export default function Saved() {
  const { user, ready, setModal } = useAuth();
  const { items, toggle, setComment } = useSaved();
  const topics = useNotes();
  if (!ready) return <div className="loading-block"><span className="spinner" /></div>;
  if (!user)
    return (
      <div className="empty-state">
        <div className="empty-icon"><Bookmark size={40} /></div>
        <h1>Saved items</h1><p>Sign in to bookmark questions and notes and add your own comments.</p>
        <button className="btn btn-primary" onClick={() => setModal("login")}>Sign in</button>
      </div>
    );
  if (!items) return <div className="loading-block"><span className="spinner" /></div>;

  return (
    <div>
      <header className="page-head"><div><h1>Saved</h1><p className="muted">Bookmarked questions and notes, with your own comments.</p></div></header>
      {items.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon"><Bookmark size={40} /></div>
          <p>Nothing saved yet. Use <strong>Save</strong> under a reviewed question, or the bookmark on a note.</p>
          <Link className="btn btn-primary" to="/notes">Browse notes</Link>
        </div>
      ) : (
        <ul className="mistake-list">
          {items.map((b) => (
            <li key={`${b.kind}:${b.ref}`} className="card mistake">
              {b.kind === "note" ? (
                <Link to={`/notes/${b.ref}`} className="saved-title"><BookOpen size={18} /> {topics?.find((t) => t.id === b.ref)?.title ?? b.ref}</Link>
              ) : b.question ? (
                <>
                  <RichText text={b.question.text} />
                  <p className="muted small"><strong>Answer:</strong> {b.question.correctAnswerIndices.map((i) => b.question.answers[i]).join(" & ")}</p>
                </>
              ) : <p className="muted">This question is no longer available.</p>}
              <Comment item={b} onSave={(c) => setComment(b.kind, b.ref, c)} />
              <button className="ra-btn" onClick={() => toggle(b.kind, b.ref)}><Trash2 size={14} /> Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
