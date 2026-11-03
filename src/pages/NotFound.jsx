import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="empty-state">
      <div className="empty-emoji">🧭</div>
      <h1>Page not found</h1>
      <p>That page doesn't exist — but there's plenty to study.</p>
      <Link className="btn btn-primary" to="/">Back home</Link>
    </div>
  );
}
