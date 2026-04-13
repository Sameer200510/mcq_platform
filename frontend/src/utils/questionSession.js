import { shuffleArray } from "./shuffle.js";

export function normalizeAnswersMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const id = parseInt(String(key), 10);
    if (Number.isNaN(id)) continue;
    if (typeof value === "number" && value >= 0 && value <= 3) {
      out[id] = value;
    }
  }
  return out;
}

/**
 * Restore display order from saved question ids; append any new questions (shuffled).
 */
export function orderQuestionsFromProgress(allQuestions, savedOrder) {
  if (!savedOrder || !Array.isArray(savedOrder) || savedOrder.length === 0) {
    return null;
  }
  const map = new Map(allQuestions.map((q) => [q.id, q]));
  const ordered = [];
  const seen = new Set();
  for (const rawId of savedOrder) {
    const id =
      typeof rawId === "number" ? rawId : parseInt(String(rawId), 10);
    if (Number.isNaN(id)) continue;
    const q = map.get(id);
    if (q) {
      ordered.push(q);
      seen.add(id);
    }
  }
  const extras = allQuestions.filter((q) => !seen.has(q.id));
  if (ordered.length === 0) return null;
  if (extras.length > 0) {
    return [...ordered, ...shuffleArray(extras)];
  }
  return ordered;
}
