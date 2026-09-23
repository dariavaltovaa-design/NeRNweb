import type { DeviceInfo } from './schema';

/** Rounds a measured refresh rate to the nearest common one (59.8 → 60), so noise does not split baselines. */
export function normaliseRefreshHz(measured: number): number {
  const common = [30, 48, 50, 60, 75, 90, 100, 120, 144, 165, 240];
  return common.reduce((best, hz) =>
    Math.abs(hz - measured) < Math.abs(best - measured) ? hz : best,
  );
}

/** FNV-1a: a tiny local hash. The fingerprint only separates baselines and never leaves the device. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function deviceInfo(refreshHz: number, inputType: DeviceInfo['inputType']): DeviceInfo {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || 'unknown';
  // Short and long side, so rotating the phone does not look like a new device.
  const short = Math.min(screen.width, screen.height);
  const long = Math.max(screen.width, screen.height);
  return {
    fingerprint: fnv1a(`${platform}|${short}x${long}|${refreshHz}`),
    refreshHz,
    inputType,
  };
}
