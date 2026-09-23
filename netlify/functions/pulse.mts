// /.netlify/functions/pulse — the anonymous average. The only server code in NeRN.
//
// POST { hour, meanRtMs } adds one number to a running aggregate. Nothing else is accepted:
// no ids, no dates, no trials. The country comes from Netlify's edge (not stored, no IP kept),
// only to decide whether the number also counts for "по Україні".
// GET returns the summary (averages appear only after 20 results).

import { getStore } from '@netlify/blobs';
import {
  addContribution,
  emptyAggregate,
  isValidContribution,
  summarize,
  type Aggregate,
} from '../../src/stats/pulse';

interface Context {
  geo?: { country?: { code?: string } };
}

const KEY = 'aggregate-v1';

export default async (request: Request, context: Context): Promise<Response> => {
  const store = getStore('pulse');

  if (request.method === 'GET') {
    const aggregate =
      ((await store.get(KEY, { type: 'json' })) as Aggregate | null) ?? emptyAggregate();
    return Response.json(summarize(aggregate), {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  if (request.method !== 'POST') return new Response(null, { status: 405 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!isValidContribution(body)) return new Response(null, { status: 400 });
  const contribution = { hour: body.hour, meanRtMs: Math.round(body.meanRtMs) };
  const inUkraine = context.geo?.country?.code === 'UA';

  // Read–modify–write with an ETag, retried if someone else wrote in between.
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(KEY, { type: 'json' });
    const aggregate = (current?.data as Aggregate | undefined) ?? emptyAggregate();
    const next = addContribution(aggregate, contribution, inUkraine);
    const result = current
      ? await store.setJSON(KEY, next, { onlyIfMatch: current.etag })
      : await store.setJSON(KEY, next, { onlyIfNew: true });
    if (result.modified) return new Response(null, { status: 204 });
  }
  return new Response(null, { status: 503 });
};
