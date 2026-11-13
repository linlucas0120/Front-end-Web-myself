export const STARTING_MONEY = 400;
export const WRONG_ANSWER_PENALTY = 100;

export function applyWrongAnswerPenalty(balance) {
  const available =
    Number.isInteger(balance) && balance >= 0 && balance <= STARTING_MONEY
      ? balance
      : STARTING_MONEY;
  const loss = Math.min(available, WRONG_ANSWER_PENALTY);
  const money = Math.max(0, available - WRONG_ANSWER_PENALTY);
  return { money, loss, reachedZero: available > 0 && money === 0 };
}
