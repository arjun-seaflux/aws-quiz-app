import { useCallback, useEffect, useReducer } from "react";
import { api } from "../api.js";
import { useAuth } from "../components/AuthContext.jsx";

// Module-level cache of the signed-in user's bookmarks, shared by every component.
let store = { uid: null, items: null, loading: false };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

async function load(uid) {
  if (store.loading) return;
  store = { uid, items: store.uid === uid ? store.items : null, loading: true };
  try {
    const { bookmarks } = await api.get("/bookmarks");
    store = { uid, items: bookmarks, loading: false };
  } catch { store = { uid, items: store.items ?? [], loading: false }; }
  emit();
}

export function useSaved() {
  const { user } = useAuth();
  const [, rerender] = useReducer((x) => x + 1, 0);
  useEffect(() => { listeners.add(rerender); return () => listeners.delete(rerender); }, []);
  useEffect(() => {
    if (!user) { store = { uid: null, items: null, loading: false }; return; }
    if (store.uid !== user.id || !store.items) load(user.id);
  }, [user]);

  const items = store.uid === user?.id ? store.items : null;
  const has = useCallback((kind, ref) => !!items?.some((b) => b.kind === kind && b.ref === ref), [items]);

  const toggle = useCallback(async (kind, ref) => {
    const on = items?.some((b) => b.kind === kind && b.ref === ref);
    await api.post("/bookmarks", { kind, ref, remove: !!on });
    await load(user.id);
  }, [items, user]);

  const setComment = useCallback(async (kind, ref, comment) => {
    await api.post("/bookmarks", { kind, ref, comment });
    await load(user.id);
  }, [user]);

  return { items, has, toggle, setComment, reload: () => user && load(user.id) };
}
