// What "normal" looks like on a phone, from published research — the reference for the result word
// until there is enough live data from Ukraine.
//
// Deering et al., 2018 (Sleep): 3-minute PVT in the SleepHealth Mobile App Study, 5,473 adults,
// 23,145 valid sessions on their own phones. Mean reaction time 481.1 ms, SD 170 ms.

export const SMARTPHONE_NORM = {
  meanRtMs: 481,
  sdMs: 170,
  people: 5473,
  sessions: 23145,
  citation: 'Deering et al., 2018, Sleep',
  url: 'https://consensus.app/papers/details/7b46d6f9e8a55d4296bdb82ec494a7eb/',
} as const;

export type Word = 'lightning' | 'sharp' | 'alert' | 'drowsy' | 'fog';

/**
 * The one word on the result screen. NeRN's own scale (a decision, not a clinical cut-off):
 * bands of half a standard deviation around the research mean.
 *   ≤ mean − 1 SD → lightning, ≤ mean − ½ SD → sharp, ≤ mean → alert, ≤ mean + ½ SD → drowsy, else fog.
 */
export function wordFor(meanRtMs: number): Word {
  const { meanRtMs: mean, sdMs: sd } = SMARTPHONE_NORM;
  if (meanRtMs <= mean - sd) return 'lightning';
  if (meanRtMs <= mean - sd / 2) return 'sharp';
  if (meanRtMs <= mean) return 'alert';
  if (meanRtMs <= mean + sd / 2) return 'drowsy';
  return 'fog';
}

/** Position on the scale from 0 (fastest band) to 1 (slowest), for the result bar. */
export function scalePosition(meanRtMs: number): number {
  const { meanRtMs: mean, sdMs: sd } = SMARTPHONE_NORM;
  const low = mean - 1.5 * sd;
  const high = mean + sd;
  return Math.min(1, Math.max(0, (meanRtMs - low) / (high - low)));
}
