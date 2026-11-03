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
const CustomPractice = lazy(() => import("./pages/CustomPractice.jsx"));
const Review = lazy(() => import("./pages/Review.jsx"));
const Saved = lazy(() => import("./pages/Saved.jsx"));
const Leaderboard = lazy(() => import("./pages/Leaderboard.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const Compete = lazy(() => import("./pages/Compete.jsx"));
const Room = lazy(() => import("./pages/Room.jsx"));
const Papers = lazy(() => import("./pages/Papers.jsx"));
const PaperBuilder = lazy(() => import("./pages/PaperBuilder.jsx"));
const CommunityPaperPage = lazy(() => import("./pages/CommunityPaper.jsx").then((m) => ({ default: m.CommunityPaperPage })));
const CommunityPlay = lazy(() => import("./pages/CommunityPaper.jsx").then((m) => ({ default: m.CommunityPlay })));
const ForgotPassword = lazy(() => import("./pages/AccountLinks.jsx").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("./pages/AccountLinks.jsx").then((m) => ({ default: m.ResetPassword })));
const VerifyEmail = lazy(() => import("./pages/AccountLinks.jsx").then((m) => ({ default: m.VerifyEmail })));

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
          <Route path="practice/custom" element={<CustomPractice />} />
          <Route path="practice/:paperNum" element={<Exam />} />
          <Route path="papers" element={<Papers />} />
          <Route path="papers/new" element={<PaperBuilder />} />
          <Route path="papers/:id" element={<CommunityPaperPage />} />
          <Route path="papers/:id/edit" element={<PaperBuilder />} />
          <Route path="papers/:id/play" element={<CommunityPlay />} />
          <Route path="review" element={<Review />} />
          <Route path="saved" element={<Saved />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="compete" element={<Compete />} />
          <Route path="compete/:code" element={<Room />} />
          <Route path="admin" element={<Admin />} />
          <Route path="forgot" element={<ForgotPassword />} />
          <Route path="reset" element={<ResetPassword />} />
          <Route path="verify" element={<VerifyEmail />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
