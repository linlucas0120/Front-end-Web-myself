// Keep an in-progress exercise through refreshes without recording answers twice.
import { STARTING_MONEY } from "./money.js?v=job-9-4";
import { activeLineQuestionIds } from "../data/questions.js?v=job-9-4";
const KEY = "vault-exercise-v1";
export function validateDraft(draft, questions) {
  const maxQuestions = draft?.branchFlow === true ? 8 : 3;
  if (
    !draft ||
    !Array.isArray(draft.ids) ||
    !draft.ids.length ||
    draft.ids.length > maxQuestions
  )
    return null;
  const selected = draft.ids.map((id) => questions.find((q) => q.id === id));
  if (selected.some((q) => !q) || new Set(draft.ids).size !== draft.ids.length)
    return null;
  const branchFlow = draft.branchFlow === true;
  const branchScenario = selected[0]?.branchScenario || null;
  if (
    !branchFlow &&
    selected.some((question) => !activeLineQuestionIds.includes(question.id))
  )
    return null;
  if (
    draft.money !== undefined &&
    (!Number.isInteger(draft.money) || draft.money < 0 || draft.money > STARTING_MONEY)
  )
    return null;
  if (
    branchFlow &&
    (!branchScenario || selected.some((q) => q.branchScenario !== branchScenario))
  )
    return null;
  const nextQuestion =
    typeof draft.nextId === "string"
      ? questions.find((q) => q.id === draft.nextId)
      : null;
  if (
    branchFlow &&
    draft.nextId != null &&
    (!nextQuestion || nextQuestion.branchScenario !== branchScenario)
  )
    return null;
  if (
    !Number.isInteger(draft.index) ||
    draft.index < 0 ||
    draft.index >= selected.length
  )
    return null;
  if (
    typeof draft.answered !== "boolean" ||
    typeof draft.complete !== "boolean"
  )
    return null;
  if (draft.answered && typeof draft.correct !== "boolean") return null;
  if (
    branchFlow &&
    draft.answered &&
    (!Number.isInteger(draft.selectedAnswer) ||
      draft.selectedAnswer < 0 ||
      draft.selectedAnswer >= selected[draft.index].options.length)
  )
    return null;
  const answeredCount = draft.index + Number(draft.answered);
  const branchPath = Array.isArray(draft.branchPath) ? draft.branchPath : [];
  if (branchFlow && branchPath.length !== answeredCount) return null;
  if (branchFlow) {
    for (let i = 0; i < branchPath.length; i++) {
      const step = branchPath[i];
      const question = selected[i];
      if (
        !step ||
        step.nodeId !== question.id ||
        step.questionId !== question.id ||
        !Number.isInteger(step.optionIndex) ||
        step.optionIndex < 0 ||
        step.optionIndex >= question.options.length ||
        step.optionText !== question.options[step.optionIndex] ||
        typeof step.correct !== "boolean" ||
        step.correct !== (step.optionIndex === question.answer)
      )
        return null;
      const expectedNext =
        i + 1 < branchPath.length
          ? branchPath[i + 1].nodeId
          : draft.answered
            ? (draft.nextId ?? null)
            : (selected[branchPath.length]?.id ?? null);
      if ((question.next[step.optionIndex] ?? null) !== expectedNext) return null;
    }
    if (branchPath.filter((step) => step.correct).length !== draft.score)
      return null;
  }
  if (
    !Number.isInteger(draft.score) ||
    draft.score < 0 ||
    draft.score > answeredCount
  )
    return null;
  if (
    draft.complete &&
    (!draft.answered || draft.index !== selected.length - 1)
  )
    return null;
  return {
    qs: selected,
    index: draft.index,
    score: draft.score,
    answered: draft.answered,
    complete: draft.complete,
    correct: draft.correct,
    selectedAnswer: Number.isInteger(draft.selectedAnswer)
      ? draft.selectedAnswer
      : null,
    branchPath: branchPath.map((step) => ({
      nodeId: step.nodeId,
      questionId: step.questionId,
      optionIndex: step.optionIndex,
      optionText: step.optionText,
      correct: step.correct,
    })),
    branchFlow,
    branchScenario,
    money: draft.money ?? STARTING_MONEY,
    bankruptAcknowledged: draft.bankruptAcknowledged === true,
    nextId: typeof draft.nextId === "string" ? draft.nextId : null,
    questionView: draft.questionView === "choose" ? "choose" : "read",
    readerOffset:
      Number.isInteger(draft.readerOffset) && draft.readerOffset >= 0
        ? draft.readerOffset
        : 0,
    readerHistory: Array.isArray(draft.readerHistory)
      ? draft.readerHistory.filter((x) => Number.isInteger(x) && x >= 0)
      : [],
    interactionStage: draft.interactionStage === "job-refusal"
      ? "job-block-ready"
      : ["compose", "fake-site", "screen-share", "hangup", "job-contact", "job-payment", "job-payment-warning", "job-block-ready", "job-menu", "job-blocked"].includes(draft.interactionStage)
      ? draft.interactionStage
      : "chat",
    sentMessage: typeof draft.sentMessage === "string" ? draft.sentMessage : "",
  };
}
export function restoreSession(questions) {
  try {
    return validateDraft(JSON.parse(sessionStorage.getItem(KEY)), questions);
  } catch {
    return null;
  }
}
export function saveSession(session) {
  try {
    if (!session) sessionStorage.removeItem(KEY);
    else
      sessionStorage.setItem(
        KEY,
        JSON.stringify({
          ids: session.qs.map((q) => q.id),
          index: session.index,
          score: session.score,
          answered: session.answered,
          complete: session.complete,
          correct: session.correct,
          selectedAnswer: session.selectedAnswer,
          branchPath: session.branchPath,
          branchFlow: session.branchFlow,
          money: session.money,
          bankruptAcknowledged: session.bankruptAcknowledged,
          nextId: session.nextId,
          questionView: session.questionView,
          readerOffset: session.readerOffset,
          readerHistory: session.readerHistory,
          interactionStage: session.interactionStage,
          sentMessage: session.sentMessage,
        }),
      );
  } catch {
    /* A blocked session store must not stop the exercise. */
  }
}
