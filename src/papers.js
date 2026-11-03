import { api } from "./api.js";

export const totalPaper = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const PAPER_NAMES = {
  1: "Practice Paper 1",
  2: "Practice Paper 2",
  3: "Practice Paper 3",
  4: "Practice Paper 4",
  5: "Practice Paper 5",
  6: "Practice Paper 6",
  7: "SM Paper 1",
  8: "SM Paper 2",
  9: "SM Paper 3",
  10: "SM Paper 4",
  11: "SM Paper 5",
  12: "SM Paper 6",
};

// Question counts (used for display before a paper is loaded).
export const paperSize = () => 65;
export const TOTAL_QUESTIONS = totalPaper.reduce((s, n) => s + paperSize(n), 0);

// Bundled copies, loaded lazily — only used if the API is unreachable.
const BUNDLED = {
  1: () => import("./assets/Papers/ND/Paper1.js").then((m) => m.paper1),
  2: () => import("./assets/Papers/ND/Paper2.js").then((m) => m.paper2),
  3: () => import("./assets/Papers/ND/Paper3.js").then((m) => m.paper3),
  4: () => import("./assets/Papers/ND/Paper4.js").then((m) => m.paper4),
  5: () => import("./assets/Papers/ND/Paper5.js").then((m) => m.paper5),
  6: () => import("./assets/Papers/ND/Paper6.js").then((m) => m.paper6),
  7: () => import("./assets/Papers/SM/SM_Paper1.js").then((m) => m.SM_paper1),
  8: () => import("./assets/Papers/SM/SM_Paper2.js").then((m) => m.SM_paper2),
  9: () => import("./assets/Papers/SM/SM_Paper3.js").then((m) => m.SM_paper3),
  10: () => import("./assets/Papers/SM/SM_Paper4.js").then((m) => m.SM_paper4),
  11: () => import("./assets/Papers/SM/SM_Paper5.js").then((m) => m.SM_paper5),
  12: () => import("./assets/Papers/SM/SM_Paper6.js").then((m) => m.SM_paper6),
};

/** Questions for a paper: from the API, falling back to the bundled copy. */
export async function loadPaper(n) {
  try {
    const { questions } = await api.get(`/papers/${n}`);
    return questions;
  } catch {
    return BUNDLED[n]();
  }
}

/** Study notes: from the API, falling back to the bundled copy. */
export async function loadNotes() {
  try {
    const { topics } = await api.get("/notes");
    return topics;
  } catch {
    return (await import("./notes.js")).default;
  }
}
