import { useEffect, useState } from "react";
import { loadNotes } from "../papers.js";

let cache = null;
let pending = null;

/** Study-note topics (null while loading). Cached for the session. */
export function useNotes() {
  const [topics, setTopics] = useState(cache);
  useEffect(() => {
    if (cache) return;
    let live = true;
    (pending ??= loadNotes())
      .then((t) => { cache = t; if (live) setTopics(t); })
      .catch(() => { pending = null; if (live) setTopics([]); });
    return () => { live = false; };
  }, []);
  return topics;
}

const KEY = "notes_read";
export function loadRead() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
export function saveRead(ids) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
}
