// Lightweight npm registry client used by the dashboard route.
// Intentionally dependency-free; runs on Vercel's Edge or Node runtime.

import { unstable_cache } from 'next/cache';

const SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const POINT_URL = 'https://api.npmjs.org/downloads/point';
const RANGE_URL = 'https://api.npmjs.org/downloads/range';

export type RangeKey = '7d' | '30d' | '90d' | '6mo' | '1y' | 'all' | 'custom';

export type DateRange = {
  key: RangeKey;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string; // human-readable
};

export type Pkg = {
  name: string;
  version: string;
  published: string;
  description: string;
  lifetime: number; // Jan 1 2025 → today, always on, independent of filter
  rangeTotal: number; // downloads inside the selected range
  spark: number[]; // daily counts across the selected range, trimmed to <=60 samples
  rangeDays: number; // number of days in the range
};

export type Portfolio = {
  username: string;
  fetchedAt: string;
  range: DateRange;
  packages: Pkg[];
  totals: { lifetime: number; rangeTotal: number };
};

async function getJson<T>(url: string, retries = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (r.status === 429 || r.status === 503) {
        await new Promise((res) => setTimeout(res, 400 * (i + 1)));
        continue;
      }
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch {
      await new Promise((res) => setTimeout(res, 400 * (i + 1)));
    }
  }
  return null;
}

export async function listPackages(username: string) {
  const out: Array<{ name: string; version: string; date: string; description: string }> = [];
  let from = 0;
  const size = 250;
  for (let page = 0; page < 5; page++) {
    const j = await getJson<{ objects: Array<{ package: { name: string; version: string; date: string; description?: string } }> }>(
      `${SEARCH_URL}?text=maintainer:${encodeURIComponent(username)}&size=${size}&from=${from}`
    );
    if (!j || !j.objects || j.objects.length === 0) break;
    for (const o of j.objects) {
      out.push({
        name: o.package.name,
        version: o.package.version,
        date: o.package.date,
        description: o.package.description || '',
      });
    }
    if (j.objects.length < size) break;
    from += size;
  }
  return out;
}

async function fetchCount(pkg: string, period: string) {
  const j = await getJson<{ downloads: number }>(`${POINT_URL}/${period}/${pkg}`);
  return j?.downloads || 0;
}

async function fetchRangeDaily(pkg: string, start: string, end: string) {
  // npm's range endpoint caps at ~540 days per request; chunk if wider.
  const chunks: Array<{ start: string; end: string }> = [];
  const startD = new Date(start);
  const endD = new Date(end);
  const msPerDay = 86400000;
  const MAX_DAYS = 500;
  let cursor = new Date(startD);
  while (cursor <= endD) {
    const windowEnd = new Date(Math.min(endD.getTime(), cursor.getTime() + (MAX_DAYS - 1) * msPerDay));
    chunks.push({
      start: cursor.toISOString().slice(0, 10),
      end: windowEnd.toISOString().slice(0, 10),
    });
    cursor = new Date(windowEnd.getTime() + msPerDay);
  }
  const out: number[] = [];
  for (const c of chunks) {
    const j = await getJson<{ downloads: Array<{ downloads: number }> }>(
      `${RANGE_URL}/${c.start}:${c.end}/${pkg}`
    );
    for (const d of j?.downloads || []) out.push(d.downloads);
  }
  return out;
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}

// Down-sample a long daily series into ≤maxPoints buckets by summing. Keeps
// the sparkline readable even for "all" (~500 days).
function downsample(values: number[], maxPoints: number) {
  if (values.length <= maxPoints) return values;
  const bucket = Math.ceil(values.length / maxPoints);
  const out: number[] = [];
  for (let i = 0; i < values.length; i += bucket) {
    const slice = values.slice(i, i + bucket);
    out.push(slice.reduce((s, n) => s + n, 0));
  }
  return out;
}

// Parse a `range` searchParam into a DateRange. Accepted values:
//   - shortcut keys: 7d, 30d, 90d, 6mo, 1y, all
//   - custom ISO range: 2026-01-01:2026-04-20
// Falls back to 30d for unknown input.
export function parseRange(raw?: string): DateRange {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);

  if (raw && /^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [s, e] = raw.split(':');
    return { key: 'custom', start: s, end: e, label: `${s} → ${e}` };
  }

  switch (raw) {
    case '7d':  return { key: '7d',  start: daysAgo(6),   end: todayStr, label: 'Last 7 days' };
    case '90d': return { key: '90d', start: daysAgo(89),  end: todayStr, label: 'Last 90 days' };
    case '6mo': return { key: '6mo', start: daysAgo(182), end: todayStr, label: 'Last 6 months' };
    case '1y':  return { key: '1y',  start: daysAgo(364), end: todayStr, label: 'Last 12 months' };
    case 'all': return { key: 'all', start: '2025-01-01', end: todayStr, label: 'All time' };
    case '30d':
    default:    return { key: '30d', start: daysAgo(29),  end: todayStr, label: 'Last 30 days' };
  }
}

type BaseRecord = {
  name: string;
  version: string;
  published: string;
  description: string;
  lifetime: number;
};

// Lifetime + package list only. Cached per-username for 1 hour, shared
// across every filter shortcut. Retries each failed lifetime once with
// backoff so Cloudflare 1015 doesn't leave us with 0s.
const fetchBaseUncached = async (username: string): Promise<BaseRecord[]> => {
  const pkgs = await listPackages(username);
  const today = new Date().toISOString().slice(0, 10);
  const rows = await mapPool(pkgs, 3, async (p): Promise<BaseRecord> => {
    let lifetime = await fetchCount(p.name, `2025-01-01:${today}`);
    if (lifetime === 0) {
      await new Promise((r) => setTimeout(r, 500));
      lifetime = await fetchCount(p.name, `2025-01-01:${today}`);
    }
    return {
      name: p.name,
      version: p.version,
      published: p.date.slice(0, 10),
      description: p.description,
      lifetime,
    };
  });
  return rows;
};

const fetchBase = unstable_cache(
  async (username: string) => fetchBaseUncached(username),
  ['pkgfolio-base-v1'],
  { revalidate: 3600, tags: ['pkgfolio'] }
);

type RangeRecord = { name: string; daily: number[] };

// One range-daily fetch per package. Retries up to 3 times with growing
// backoff if the API returned empty (Cloudflare 1015 surfaces as empty,
// not as an HTTP error). Expected range lengths are computed so we can
// distinguish "really zero" from "truncated by rate-limit".
async function fetchRangeOnce(pkg: string, start: string, end: string) {
  const expectedDays = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  for (let attempt = 0; attempt < 3; attempt++) {
    const daily = await fetchRangeDaily(pkg, start, end);
    // Truncation detector: npm sometimes returns fewer days than requested when rate-limited.
    const truncated = daily.length < Math.max(1, expectedDays * 0.9);
    if (!truncated) return daily;
    await new Promise((r) => setTimeout(r, 500 + attempt * 600 + Math.random() * 300));
  }
  return await fetchRangeDaily(pkg, start, end);
}

// Cached per (username, range) pair for 10 minutes. Clicking shortcut chips
// repeatedly doesn't re-fire 17 queries each time; Next serves from cache.
const fetchRangeData = unstable_cache(
  async (username: string, start: string, end: string, names: string[]): Promise<RangeRecord[]> => {
    return await mapPool(names, 2, async (name) => {
      const daily = await fetchRangeOnce(name, start, end);
      return { name, daily };
    });
  },
  ['pkgfolio-range-v2'],
  { revalidate: 600, tags: ['pkgfolio'] }
);

export async function fetchPortfolio(username: string, range: DateRange): Promise<Portfolio> {
  const base = await fetchBase(username);
  const names = base.map((b) => b.name);
  const rangeData = await fetchRangeData(username, range.start, range.end, names);
  const byName = new Map(rangeData.map((r) => [r.name, r.daily]));

  const ranged: Pkg[] = base.map((b) => {
    const daily = byName.get(b.name) || [];
    const rangeTotal = daily.reduce((s, n) => s + n, 0);
    const spark = downsample(daily, 60);
    return {
      ...b,
      rangeTotal,
      spark,
      rangeDays: daily.length,
    };
  });

  // Sort by range total first (matches what the filter is asking about),
  // tiebreak by lifetime for stability.
  ranged.sort((a, b) => b.rangeTotal - a.rangeTotal || b.lifetime - a.lifetime);

  const totals = ranged.reduce(
    (t, r) => ({
      lifetime: t.lifetime + r.lifetime,
      rangeTotal: t.rangeTotal + r.rangeTotal,
    }),
    { lifetime: 0, rangeTotal: 0 }
  );

  return {
    username,
    fetchedAt: new Date().toISOString(),
    range,
    packages: ranged,
    totals,
  };
}
