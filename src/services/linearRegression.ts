export type Point = { x: number; y: number };

export type RegressionResult = {
  slope: number;
  intercept: number;
  rSquared: number;
  meanX: number;
  meanY: number;
  minX: number;
  maxX: number;
};

export function linearRegression(data: Point[]): RegressionResult | null {
  if (data.length < 2) return null;

  const n = data.length;
  const meanX = data.reduce((acc, p) => acc + p.x, 0) / n;
  const meanY = data.reduce((acc, p) => acc + p.y, 0) / n;

  let ssXX = 0;
  let ssXY = 0;

  // Use centered values for numerical stability with large timestamps.
  for (const p of data) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
  }

  let slope = 0;
  let intercept = meanY;

  if (ssXX !== 0) {
    slope = ssXY / ssXX;
    intercept = meanY - slope * meanX;
  }

  let ssTot = 0;
  let ssRes = 0;
  for (const p of data) {
    const yHat = slope * (p.x - meanX) + meanY;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yHat) ** 2;
  }

  const rawRSquared = ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot;
  const rSquared = Math.max(0, Math.min(1, rawRSquared));

  const xs = data.map((d) => d.x);

  return {
    slope,
    intercept,
    rSquared,
    meanX,
    meanY,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
  };
}
