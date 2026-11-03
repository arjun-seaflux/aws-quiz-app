import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, PartyPopper } from "lucide-react";
import Quiz from "../components/Quiz.jsx";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";

const TITLES = {
  weak: "Weak-area practice", mistakes: "Mistake review", domain: "Domain practice",
  topic: "Topic practice", random: "Random practice",
};

export default function CustomPractice() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, ready, setModal } = useAuth();
  const [state, setState] = useState({ status: "loading" });
  const query = useMemo(() => params.toString(), [params]);
  const mode = params.get("mode") || "random";

  useEffect(() => {
    if (!ready || !user) return;
    let live = true;
    setState({ status: "loading" });
    api.get(`/practice?${query}`)
      .then((d) => live && setState({ status: "ok", ...d }))
      .catch((e) => live && setState({ status: "error", message: e.message }));
    return () => { live = false; };
  }, [query, ready, user]);

  const { recordAttempt } = useAuth();
  const back = useMemo(() => () => navigate("/practice"), [navigate]);

  if (!ready) return <div className="loading-block"><span className="spinner" /></div>;
  if (!user)
    return (
      <div className="empty-state">
        <h1>{TITLES[mode] ?? "Practice"}</h1>
        <p>Custom practice builds a question set from your history, so you need an account.</p>
        <button className="btn btn-primary" onClick={() => setModal("login")}>Sign in</button>
      </div>
    );
  if (state.status === "loading") return <div className="loading-block"><span className="spinner" /> Building your question set…</div>;
  if (state.status === "error")
    return (
      <div className="empty-state">
        <div className="empty-icon"><AlertTriangle size={40} /></div>
        <p>{state.message}</p><Link className="btn btn-primary" to="/practice">Back</Link>
      </div>
    );
  if (state.questions.length === 0)
    return (
      <div className="empty-state">
        <div className="empty-icon"><PartyPopper size={40} /></div>
        <h1>{mode === "mistakes" ? "No mistakes to review" : "No questions found"}</h1>
        <p>{mode === "mistakes" ? "Everything you've answered is correct — nice work. Take an exam to build your notebook." : "Try a different topic or domain."}</p>
        <Link className="btn btn-primary" to="/practice">Back to practice</Link>
      </div>
    );

  return (
    <Quiz
      key={query}
      questions={state.questions}
      paperNum={0}
      mode="practice"
      onBackToHome={back}
      backLabel="Back to practice"
      onPaperComplete={recordAttempt}
    />
  );
}
