export function calcPoints(
  predHome: number,
  predAway: number,
  finalHome: number,
  finalAway: number,
  pointsExact: number,
  pointsOutcome: number
) {
  if (predHome === finalHome && predAway === finalAway) return pointsExact;

  const predDiff = predHome - predAway;
  const finalDiff = finalHome - finalAway;

  const sameOutcome =
    (predDiff === 0 && finalDiff === 0) ||
    (predDiff > 0 && finalDiff > 0) ||
    (predDiff < 0 && finalDiff < 0);

  return sameOutcome ? pointsOutcome : 0;
}
