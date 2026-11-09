export function calculateTimeTarget(
  bestTimeSeconds: number | null | undefined,
  intensityPercentage: number | null | undefined,
): number | null {
  if (!bestTimeSeconds || !intensityPercentage || intensityPercentage <= 0) {
    return null;
  }
  const rawTarget = bestTimeSeconds / (intensityPercentage / 100);
  return Math.round(rawTarget * 10) / 10;
}
