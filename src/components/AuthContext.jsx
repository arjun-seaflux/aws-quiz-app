import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { loadLocalScores, saveLocalScores } from "../scores.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [serverScores, setServerScores] = useState({});
  const [localScores, setLocalScores] = useState(loadLocalScores);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(null); // null | "login" | "register"

  useEffect(() => {
    api.get("/me")
      .then((d) => { setUser(d.user); setServerScores(d.scores || {}); })
      .catch(() => {}) // API unavailable → stay in guest mode
      .finally(() => setReady(true));
  }, []);

  // Carry guest scores over to a freshly signed-in account.
  const importGuestScores = useCallback(async () => {
    const local = loadLocalScores();
    if (Object.keys(local).length === 0) return;
    try {
      const d = await api.post("/import-scores", { scores: local });
      setServerScores(d.scores);
    } catch { /* non-fatal */ }
  }, []);

  const finishAuth = useCallback(async (u) => {
    setUser(u);
    const me = await api.get("/me").catch(() => null);
    if (me) setServerScores(me.scores || {});
    await importGuestScores();
    setModal(null);
  }, [importGuestScores]);

  const login = useCallback(async (email, password) => {
    const d = await api.post("/auth/login", { email, password });
    await finishAuth(d.user);
  }, [finishAuth]);

  const register = useCallback(async (name, email, password) => {
    const d = await api.post("/auth/register", { name, email, password });
    await finishAuth(d.user);
  }, [finishAuth]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
    setServerScores({});
  }, []);

  /** Called when an exam is submitted. Saves to the account, or locally for guests. */
  const recordAttempt = useCallback(async (paperNum, scorePct, { answers, timeTaken }) => {
    if (user) {
      try {
        const d = await api.post("/attempts", { paperNum, answers, timeTaken });
        setServerScores(d.scores);
        return;
      } catch { /* fall through to local so progress isn't lost */ }
    }
    setLocalScores((prev) => {
      const next = { ...prev, [paperNum]: Math.max(prev[paperNum] ?? 0, scorePct) };
      saveLocalScores(next);
      return next;
    });
  }, [user]);

  const value = useMemo(() => ({
    user, ready, modal, setModal,
    scores: user ? serverScores : localScores,
    login, register, logout, recordAttempt,
  }), [user, ready, modal, serverScores, localScores, login, register, logout, recordAttempt]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
