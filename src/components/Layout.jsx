import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header.jsx";
import AuthModal from "./AuthModal.jsx";
import { useAuth } from "./AuthContext.jsx";

export default function Layout() {
  const { pathname } = useLocation();
  const { ready } = useAuth();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <Header />
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
