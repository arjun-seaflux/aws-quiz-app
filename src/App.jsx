import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Practice from "./pages/Practice.jsx";
import Notes from "./pages/Notes.jsx";
import NotFound from "./pages/NotFound.jsx";

// Heavier pages load on demand.
const NoteTopic = lazy(() => import("./pages/NoteTopic.jsx"));
const Exam = lazy(() => import("./pages/Exam.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));

const Loading = () => <div className="loading-block"><span className="spinner" /> Loading…</div>;

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="notes" element={<Notes />} />
          <Route path="notes/:topicId" element={<NoteTopic />} />
          <Route path="practice" element={<Practice />} />
          <Route path="practice/:paperNum" element={<Exam />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
