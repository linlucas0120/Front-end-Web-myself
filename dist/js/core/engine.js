import { branchScenarios } from "../data/questions.js?v=branch-2";

export function shuffle(a) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Pure functions: no DOM or browser storage dependencies.
export function findMistakes(questions, attempts) {
  return questions.filter((question) => {
    const history = attempts.filter((attempt) => attempt.id === question.id);
    return history.length > 0 && !history.at(-1).correct;
  });
}
export function selectReview(
  questions,
  attempts,
  count = 3,
  random = Math.random,
  now = Date.now(),
) {
  return questions
    .map((q) => {
      const history = attempts.filter((a) => a.id === q.id);
      let priority = !history.length
        ? 150
        : 100 - Math.min(90, history.length * 15);
      if (history.length && !history.at(-1).correct) {
        priority = 200 + (now - history.at(-1).time) / 1e10;
      }
      return { question: q, priority: priority + random() * 3 };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, count)
    .map((entry) => entry.question);
}
export function selectQuestions(questions, attempts, mode, questionId) {
  if (questionId) return questions.filter((q) => q.id === questionId);
  const scenario = branchScenarios.find((item) => item.mode === mode);
  if (scenario)
    return questions.filter((q) => q.id === scenario.startId).slice(0, 1);
  if (mode === "review") return selectReview(questions, attempts);
  const regularQuestions = questions.filter((q) => !q.branchScenario);
  return shuffle(
    regularQuestions.filter((q) => mode === "random" || q.type === mode),
  ).slice(0, 3);
}
