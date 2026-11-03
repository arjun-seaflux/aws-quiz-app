import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import AuthModal from "./AuthModal.jsx";
import { useAuth } from "./AuthContext.jsx";
import { MailWarning } from "lucide-react";
import { api } from "../api.js";

export default function Layout() {
  const { pathname } = useLocation();
  const { ready, user } = useAuth();
  const [sent, setSent] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <Header />
      {user && !user.emailVerified && (
        <div className="verify-banner" role="status">
          <MailWarning size={16} />
          <span>Please verify your email{sent ? " — link sent, check your inbox." : "."}</span>
          {!sent && <button className="link-btn" onClick={() => api.post("/auth/resend").then(() => setSent(true)).catch(() => {})}>Resend link</button>}
        </div>
      )}
      <main className={`page ${ready ? "" : "page--booting"}`}>
        <Outlet />
      </main>
      <footer className="ft">
        Notes based on arkalim's DVA-C02 Notion · Questions from Digital Cloud Training
      </footer>
      <AuthModal />
    </>
  );
}
