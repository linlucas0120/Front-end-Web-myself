import { bank, branchScenarios } from "../data/questions.js?v=job-9-4";
import { findMistakes } from "./engine.js?v=job-9-4";
const STORAGE_KEY = "vault-training-v1";
const SCENARIO_RESULTS_KEY = "vault-scenario-results-v1";
const DEFAULT_SETTINGS = {
  large: true,
  voice: false,
  fontLevel: 2,
  speechLanguage: "mandarin",
};
let state = { attempts: [], settings: { ...DEFAULT_SETTINGS } };
let scenarioResults = [];
let storageOK = true;
let notifyWarning = () => {};
export function loadState(onWarning = () => {}) {
  notifyWarning = onWarning;
  state = { attempts: [], settings: { ...DEFAULT_SETTINGS } };
  scenarioResults = [];
  storageOK = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.attempts)) {
      state.attempts = saved.attempts.filter(
        (a) =>
          a &&
          bank.some((q) => q.id === a.id) &&
          typeof a.correct === "boolean",
      );
      for (const key of ["large", "voice"]) {
        if (typeof saved.settings?.[key] === "boolean")
          state.settings[key] = saved.settings[key];
      }
      state.settings.speechLanguage = ["taigi", "hakka"].includes(
        saved.settings?.speechLanguage,
      )
        ? saved.settings.speechLanguage
        : "mandarin";
      const level = saved.settings?.fontLevel;
      state.settings.fontLevel =
        Number.isInteger(level) && level >= 0 && level <= 3
          ? level
          : typeof saved.settings?.large === "boolean"
            ? saved.settings.large
              ? 1
              : 0
            : DEFAULT_SETTINGS.fontLevel;
      state.settings.large = state.settings.fontLevel > 0;
    }
  } catch {
    storageOK = false;
  }
  try {
    const savedResults = JSON.parse(localStorage.getItem(SCENARIO_RESULTS_KEY));
    if (Array.isArray(savedResults))
      scenarioResults = savedResults
        .map(normalizeScenarioResult)
        .filter(Boolean);
  } catch {
    if (storageOK)
      notifyWarning("目前無法讀取情境紀錄，本次仍可練習。");
  }
  if (!storageOK) notifyWarning("目前無法讀取儲存空間，本次仍可練習。");
}
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    notifyWarning("瀏覽器無法儲存，目前紀錄只保留在本次開啟期間。");
  }
}
// Return a copy so pages and external modules cannot mutate stored state.
export function getState() {
  return structuredClone(state);
}
export function getScenarioResults() {
  return structuredClone(scenarioResults);
}
export function updateSettings(patch) {
  if (["mandarin", "taigi", "hakka"].includes(patch.speechLanguage))
    state.settings.speechLanguage = patch.speechLanguage;
  for (const key of ["large", "voice"]) {
    if (typeof patch[key] === "boolean") state.settings[key] = patch[key];
  }
  if (
    Number.isInteger(patch.fontLevel) &&
    patch.fontLevel >= 0 &&
    patch.fontLevel <= 3
  ) {
    state.settings.fontLevel = patch.fontLevel;
    state.settings.large = patch.fontLevel > 0;
  } else if (typeof patch.large === "boolean") {
    state.settings.fontLevel = patch.large ? 1 : 0;
  }
  persist();
}
export function getMistakes() {
  return findMistakes(bank, state.attempts);
}
export function recordResult(payload) {
  const question = bank.find((q) => q.id === payload?.questionId);
  if (!question || typeof payload.correct !== "boolean")
    throw new Error("請提供題庫內的 questionId 與布林值 correct");
  state.attempts.push({
    id: question.id,
    type: question.type,
    correct: payload.correct,
    time: Date.now(),
  });
  persist();
  window.dispatchEvent(
    new CustomEvent("vault:result-saved", {
      detail: { questionId: question.id, correct: payload.correct },
    }),
  );
}

function normalizeScenarioResult(payload) {
  if (
    !payload ||
    typeof payload.scenarioId !== "string" ||
    !Array.isArray(payload.path) ||
    !payload.path.length ||
    payload.path.length > 8
  )
    return null;
  const scenario = branchScenarios.find((item) => item.id === payload.scenarioId);
  if (!scenario) return null;
  let expectedNodeId = scenario.startId;
  let correctCount = 0;
  const path = [];
  for (let i = 0; i < payload.path.length; i++) {
    const step = payload.path[i];
    const question = bank.find(
      (item) =>
        item.id === expectedNodeId && item.branchScenario === scenario.id,
    );
    if (
      !question ||
      step?.nodeId !== question.id ||
      step?.questionId !== question.id ||
      !Number.isInteger(step.optionIndex) ||
      step.optionIndex < 0 ||
      step.optionIndex >= question.options.length ||
      step.optionText !== question.options[step.optionIndex] ||
      typeof step.correct !== "boolean"
    )
      return null;
    const correct = step.optionIndex === question.answer;
    if (step.correct !== correct) return null;
    const nextId = question.next[step.optionIndex] ?? null;
    if (i < payload.path.length - 1) {
      if (!nextId || nextId !== payload.path[i + 1]?.nodeId) return null;
      expectedNodeId = nextId;
    } else if (
      nextId !== null ||
      question.endingIds?.[step.optionIndex] !== payload.endingId
    )
      return null;
    correctCount += Number(correct);
    path.push({
      nodeId: question.id,
      questionId: question.id,
      optionIndex: step.optionIndex,
      optionText: question.options[step.optionIndex],
      correct,
    });
  }
  if (payload.score !== correctCount || payload.maxScore !== path.length)
    return null;
  return {
    scenarioId: scenario.id,
    path,
    endingId: payload.endingId,
    score: correctCount,
    maxScore: path.length,
    completedAt: Number.isFinite(payload.completedAt)
      ? payload.completedAt
      : Date.now(),
  };
}

export function recordScenarioResult(payload) {
  const result = normalizeScenarioResult(payload);
  if (!result)
    throw new Error("情境結果路徑、選項、分數或結局不符合題庫設定");
  scenarioResults.push(result);
  try {
    localStorage.setItem(SCENARIO_RESULTS_KEY, JSON.stringify(scenarioResults));
  } catch {
    notifyWarning("瀏覽器無法儲存情境紀錄，目前只保留在本次開啟期間。");
  }
  const detail = structuredClone(result);
  window.dispatchEvent(
    new CustomEvent("vault:scenario-result-saved", { detail }),
  );
  return detail;
}
