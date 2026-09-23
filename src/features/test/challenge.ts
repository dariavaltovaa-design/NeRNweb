// "Кинути виклик другу": the challenge lives entirely in the link — no server, no accounts.
// /?vs=312&from=Даша → the friend sees the number, takes the test, and the result compares.

export interface Challenge {
  ms: number;
  name: string | null;
}

export function readChallenge(params: URLSearchParams): Challenge | null {
  const ms = Number(params.get('vs'));
  if (!Number.isInteger(ms) || ms < 100 || ms > 2000) return null;
  const raw = (params.get('from') ?? '').trim().slice(0, 24);
  return { ms, name: raw || null };
}

export function challengeQuery(challenge: Challenge | null): string {
  if (!challenge) return '';
  const from = challenge.name ? `&from=${encodeURIComponent(challenge.name)}` : '';
  return `vs=${challenge.ms}${from}`;
}

export function challengeUrl(ms: number, name: string): string {
  const query = challengeQuery({ ms: Math.round(ms), name: name.trim() || null });
  return `${window.location.origin}/?${query}`;
}

/** Share sheet on phones; copy to clipboard elsewhere. Returns 'copied' when it copied. */
export async function shareChallenge(
  text: string,
  url: string,
): Promise<'shared' | 'copied' | 'failed'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'failed';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
