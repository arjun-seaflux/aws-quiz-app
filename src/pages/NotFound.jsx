import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Compass size={40} /></div>
      <h1>Page not found</h1>
      <p>That page doesn't exist — but there's plenty to study.</p>
      <Link className="btn btn-primary" to="/">Back home</Link>
    </div>
  );
}
