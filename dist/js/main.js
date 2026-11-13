import { toast } from "./components/notifications.js?v=job-9-4";
import { loadState } from "./core/store.js?v=job-9-4";
import { createRouter } from "./core/router.js?v=job-9-4";
import { initAccessibility } from "./features/accessibility.js?v=job-9-4";
import { createExerciseController } from "./features/exercise.js?v=job-9-4";
import { initIntegration } from "./features/integration.js?v=job-9-4";
import { exportProgress } from "./features/export.js?v=job-9-4";

loadState(toast);
let router;
const exercise = createExerciseController({ refresh: () => router.render() });
router = createRouter(exercise);
initAccessibility();
initIntegration(exercise);
router.init();

// One application event boundary; each feature owns its implementation.
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-home")) {
    exercise.close();
    location.hash = "home";
  } else if (button.dataset.start) exercise.start(button.dataset.start);
  else if (button.dataset.question)
    exercise.start(null, button.dataset.question);
  else if (button.hasAttribute("data-reader-next")) exercise.reader("next");
  else if (button.hasAttribute("data-reader-back")) exercise.reader("back");
  else if (button.hasAttribute("data-reader-previous"))
    exercise.reader("previous");
  else if (button.hasAttribute("data-bankrupt-dismiss"))
    exercise.dismissBankruptcy();
  else if (button.dataset.sceneAction)
    exercise.sceneAction(button.dataset.sceneAction);
  else if (button.hasAttribute("data-answer"))
    exercise.answer(Number(button.dataset.answer));
  else if (button.hasAttribute("data-next")) exercise.next();
  else if (button.hasAttribute("data-close")) exercise.close();
  else if (button.dataset.finish) {
    exercise.close();
    location.hash = button.dataset.finish;
  } else if (button.hasAttribute("data-read")) exercise.read();
  else if (button.id === "exportBtn") exportProgress();
});
