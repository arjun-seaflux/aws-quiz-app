import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, BookOpen, Layers, MessageSquareWarning, Check } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "./AuthContext.jsx";
import { useNotes } from "../hooks/useNotes.js";
import { useSaved } from "../hooks/useSaved.js";
import { matchTopics } from "../../shared/topicKeywords.js";
import Dialog from "./Dialog.jsx";

/** Under a reviewed question: study links, bookmark, add-to-flashcards, report. */
export default function ReviewActions({ question, qkey }) {
  const { user, setModal } = useAuth();
  const topics = useNotes();
  const { has, toggle } = useSaved();
  const [carded, setCarded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [reportState, setReportState] = useState("idle"); // idle | busy | sent | error

  const ids = matchTopics(`${question.text} ${question.answers.join(" ")}`);
  const links = ids.map((id) => ({ id, title: topics?.find((t) => t.id === id)?.title ?? id }));
  const needUser = (fn) => () => (user ? fn() : setModal("login"));
  const saved = qkey && has("question", qkey);

  const sendReport = async () => {
    setReportState("busy");
    try { await api.post("/feedback", { key: qkey, message: msg }); setReportState("sent"); }
    catch (e) { setReportState(e.message || "error"); }
  };

  return (
    <div className="ra">
      {links.map((l) => (
        <Link key={l.id} to={`/notes/${l.id}`} className="ra-chip" title="Open the study notes">
          <BookOpen size={14} /> Study: {l.title}
        </Link>
      ))}
      {qkey && (
        <>
          <button className={`ra-btn ${saved ? "on" : ""}`} onClick={needUser(() => toggle("question", qkey))}>
            {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {saved ? "Saved" : "Save"}
          </button>
          <button className={`ra-btn ${carded ? "on" : ""}`} disabled={carded}
            onClick={needUser(async () => { await api.post("/cards", { action: "add", key: qkey }); setCarded(true); })}>
            {carded ? <Check size={14} /> : <Layers size={14} />} {carded ? "In flashcards" : "Flashcard"}
          </button>
          <button className="ra-btn" onClick={needUser(() => { setReportState("idle"); setReportOpen(true); })}>
            <MessageSquareWarning size={14} /> Report
          </button>
        </>
      )}

      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={reportState === "sent" ? "Thanks for the report" : "Report a problem"}
        icon={MessageSquareWarning}
        tone="warn"
        actions={reportState === "sent"
          ? <button className="btn btn-primary" data-autofocus onClick={() => setReportOpen(false)}>Done</button>
          : <>
              <button className="btn btn-ghost" onClick={() => setReportOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={sendReport} disabled={msg.trim().length < 5 || reportState === "busy"}>Send report</button>
            </>}
      >
        {reportState === "sent" ? <p>An admin will review this question.</p> : (
          <>
            <p>What looks wrong with this question or its answer?</p>
            <textarea className="textarea" rows={4} maxLength={500} value={msg} autoFocus
              onChange={(e) => setMsg(e.target.value)} placeholder="e.g. Option C is also correct because…" />
            {reportState !== "idle" && reportState !== "busy" && <p className="auth-error">{reportState}</p>}
          </>
        )}
      </Dialog>
    </div>
  );
}
