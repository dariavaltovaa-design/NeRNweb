/**
 * Quantile with linear interpolation between neighbours (the common "type 7" definition,
 * the default in R, NumPy and spreadsheets). p from 0 to 1.
 */
export function quantile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new Error('quantile of an empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const a = sorted[lower]!;
  const b = sorted[upper]!;
  return a + (b - a) * (position - lower);
}

export function median(values: readonly number[]): number {
  return quantile(values, 0.5);
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) throw new Error('mean of an empty list');
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
