import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Diagram from "../components/Diagram.jsx";
import { useNotes, loadRead, saveRead } from "../hooks/useNotes.js";
import { NOTES_EXTRAS } from "../notesExtras.js";
import { ArrowLeft, ArrowRight, Check, ChevronDown, FileQuestion, Lightbulb } from "lucide-react";
import { TopicIcon } from "../topicIcons.jsx";

function Section({ sub, open, onToggle }) {
  return (
    <div className={`acc ${open ? "open" : ""}`}>
      <button className="acc-head" onClick={onToggle} aria-expanded={open}>
        <span>{sub.title}</span>
        <ChevronDown className="acc-chev" size={18} aria-hidden />
      </button>
      {open && (
        <ul className="acc-body">
          {sub.content.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function NoteTopic() {
  const { topicId } = useParams();
  const topics = useNotes();
  const [openSet, setOpenSet] = useState(() => new Set([0]));
  const [read, setRead] = useState(() => new Set(loadRead()));

  useEffect(() => { setOpenSet(new Set([0])); }, [topicId]);

  if (!topics) return <div className="loading-block"><span className="spinner" /> Loading…</div>;
  const idx = topics.findIndex((t) => t.id === topicId);
  if (idx === -1)
    return (
      <div className="empty-state">
        <div className="empty-icon"><FileQuestion size={40} /></div><h1>Topic not found</h1>
        <Link className="btn btn-primary" to="/notes">All notes</Link>
      </div>
    );

  const topic = topics[idx];
  const extras = NOTES_EXTRAS[topic.id] || {};
  const prev = topics[idx - 1], next = topics[idx + 1];
  const isRead = read.has(topic.id);
  const allOpen = openSet.size === topic.subtopics.length;

  const toggle = (i) => setOpenSet((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const toggleRead = () => {
    const n = new Set(read);
    n.has(topic.id) ? n.delete(topic.id) : n.add(topic.id);
    setRead(n); saveRead([...n]);
  };

  return (
    <article className="note" style={{ "--accent": topic.borderColor }}>
      <Link to="/notes" className="back-link"><ArrowLeft size={16} /> All notes</Link>
      <header className="note-head">
        <span className="topic-icon topic-icon--lg"><TopicIcon id={topic.id} size={30} /></span>
        <div>
          <h1>{topic.title}</h1>
          <p className="muted">{topic.subtopics.length} sections · topic {idx + 1} of {topics.length}</p>
        </div>
        <button className={`btn ${isRead ? "btn-ok" : "btn-ghost"}`} onClick={toggleRead}>
          {isRead ? <><Check size={16} /> Marked as read</> : "Mark as read"}
        </button>
      </header>

      {extras.diagrams?.map((d) => <Diagram key={d.title} spec={d} />)}

      {extras.tips && (
        <aside className="callout">
          <h3><Lightbulb size={18} /> Exam tips</h3>
          <ul>{extras.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </aside>
      )}

      {extras.tables?.map((t) => (
        <div className="tbl-wrap" key={t.title}>
          <h3 className="tbl-title">{t.title}</h3>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead><tr>{t.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>{t.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="acc-toolbar">
        <h2 className="section-title">Detailed notes</h2>
        <button className="link-btn" onClick={() => setOpenSet(allOpen ? new Set() : new Set(topic.subtopics.map((_, i) => i)))}>
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      {topic.subtopics.map((s, i) => <Section key={i} sub={s} open={openSet.has(i)} onToggle={() => toggle(i)} />)}

      <nav className="note-nav">
        {prev ? <Link to={`/notes/${prev.id}`}><ArrowLeft size={16} /> {prev.title}</Link> : <span />}
        {next ? <Link to={`/notes/${next.id}`}>{next.title} <ArrowRight size={16} /></Link> : <span />}
      </nav>
    </article>
  );
}
