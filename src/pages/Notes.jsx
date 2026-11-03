import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNotes, loadRead } from "../hooks/useNotes.js";
import { NOTES_EXTRAS } from "../notesExtras.js";

export function matches(topic, q) {
  const s = q.toLowerCase();
  return (
    topic.title.toLowerCase().includes(s) ||
    topic.subtopics.some((t) => t.title.toLowerCase().includes(s) || t.content.some((c) => c.toLowerCase().includes(s)))
  );
}

export default function Notes() {
  const topics = useNotes();
  const [search, setSearch] = useState("");
  const read = useMemo(() => new Set(loadRead()), []);

  if (!topics) return <div className="loading-block"><span className="spinner" /> Loading notes…</div>;

  const shown = search.trim() ? topics.filter((t) => matches(t, search.trim())) : topics;
  const readCount = topics.filter((t) => read.has(t.id)).length;

  return (
    <div>
      <header className="page-head">
        <div>
          <h1>Study notes</h1>
          <p className="muted">{topics.length} topics with diagrams, cheat-sheets and exam tips.</p>
        </div>
        <div className="page-head-side">
          <strong>{readCount}/{topics.length}</strong>
          <span>topics read</span>
        </div>
      </header>

      <div className="search">
        <span aria-hidden>🔍</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search topics and concepts — e.g. “visibility timeout”"
          aria-label="Search notes"
        />
      </div>

      {shown.length === 0 ? (
        <div className="empty-state"><div className="empty-emoji">🔎</div><p>No topics match “{search}”.</p></div>
      ) : (
        <div className="topic-grid">
          {shown.map((t) => {
            const extras = NOTES_EXTRAS[t.id];
            return (
              <Link key={t.id} to={`/notes/${t.id}`} className="card topic-card" style={{ "--accent": t.borderColor }}>
                <div className="topic-top">
                  <span className="topic-icon">{t.icon}</span>
                  {read.has(t.id) && <span className="pill pill--passed">✓ Read</span>}
                </div>
                <h3>{t.title}</h3>
                <p className="muted">{t.subtopics.length} sections</p>
                <div className="topic-tags">
                  {extras?.diagrams && <span className="tag">🗺 {extras.diagrams.length} diagram{extras.diagrams.length > 1 ? "s" : ""}</span>}
                  {extras?.tables && <span className="tag">📋 Cheat-sheet</span>}
                  {extras?.tips && <span className="tag">💡 Tips</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
