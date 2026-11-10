import { bank } from "../data/questions.js?v=branch-2";
import {
  getState,
  getScenarioResults,
  recordResult,
} from "../core/store.js?v=branch-2";
import { toast } from "../components/notifications.js?v=branch-2";
// Public compatibility boundary shared by the three team modules.
export function initIntegration(exercise) {
  window.VaultTraining = Object.freeze({
    recordResult,
    getQuestions: () => structuredClone(bank),
    getProgress: () => getState().attempts,
    getScenarioResults,
    startPractice: (mode) =>
      exercise.start(
        ["line", "phone", "shop", "review", "borrow-branch"].includes(mode)
          ? mode
          : "random",
      ),
  });
  window.addEventListener("vault:module-result", (event) => {
    try {
      recordResult(event.detail);
    } catch {
      toast("模組結果格式不正確，未儲存。");
    }
  });
}
