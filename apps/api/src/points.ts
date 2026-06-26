export const EXACT_SCORE_POINTS = 3;
export const CORRECT_WINNER_POINTS = 1;
export const PENALTY_WINNER_BONUS_POINTS = 0.5;

export function calcPoints(
  predHome: number,
  predAway: number,
  finalHome: number,
  finalAway: number,
  predPenaltyWinnerIsHome?: boolean | null,
  finalPenaltyWinnerIsHome?: boolean | null
) {
  const predDiff = predHome - predAway;
  const finalDiff = finalHome - finalAway;
  const predIsDraw = predDiff === 0;
  const finalIsDraw = finalDiff === 0;

  const penaltyBonus =
    predIsDraw
    && finalIsDraw
    && predPenaltyWinnerIsHome !== null
    && predPenaltyWinnerIsHome !== undefined
    && finalPenaltyWinnerIsHome !== null
    && finalPenaltyWinnerIsHome !== undefined
    && predPenaltyWinnerIsHome === finalPenaltyWinnerIsHome
      ? PENALTY_WINNER_BONUS_POINTS
      : 0;

  if (predHome === finalHome && predAway === finalAway) {
    return predIsDraw ? EXACT_SCORE_POINTS + penaltyBonus : EXACT_SCORE_POINTS;
  }

  if (predIsDraw && finalIsDraw) return CORRECT_WINNER_POINTS + penaltyBonus;

  // If either prediction or final result is a draw, there is no winner to compare.
  if (predIsDraw || finalIsDraw) return 0;

  const sameWinner =
    (predDiff > 0 && finalDiff > 0) ||
    (predDiff < 0 && finalDiff < 0);

  return sameWinner ? CORRECT_WINNER_POINTS : 0;
}
