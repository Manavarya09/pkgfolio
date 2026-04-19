// Lightweight npm registry client used by the dashboard route.
// Intentionally dependency-free; runs on Vercel's Edge or Node runtime.

const SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const POINT_URL = 'https://api.npmjs.org/downloads/point';
const RANGE_URL = 'https://api.npmjs.org/downloads/range';

export type Pkg = {
  name: string;
  version: string;
  published: string;
  description: string;
  lifetime: number;
  lastMonth: number;
  lastWeek: number;
  lastDay: number;
  spark: number[];
};

export type Portfolio = {
  username: string;
  fetchedAt: string;
  packages: Pkg[];
  totals: { lifetime: number; lastMonth: number; lastWeek: number; lastDay: number };
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

async function fetchSpark(pkg: string, days = 30) {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const j = await getJson<{ downloads: Array<{ downloads: number }> }>(
    `${RANGE_URL}/${fmt(start)}:${fmt(end)}/${pkg}`
  );
  return (j?.downloads || []).map((d) => d.downloads);
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

export async function fetchPortfolio(username: string): Promise<Portfolio> {
  const pkgs = await listPackages(username);
  const today = new Date().toISOString().slice(0, 10);

  // Per-package, fetch its 5 numbers in parallel; across packages, throttle
  // to 4 concurrent. Keeps us under Cloudflare's 1015 limit on the npm API
  // while finishing a typical portfolio in <5s.
  const rows = await mapPool(pkgs, 4, async (p): Promise<Pkg> => {
    // Two queries per package: lifetime (1 point query) and sparkline (1
    // 30-day range). lastMonth/lastWeek/lastDay are computed from the spark
    // array — cuts us from 5 queries per package to 2, finishes in ~5s for
    // 17 packages, stays well under Cloudflare's 1015 limit.
    const [lifetime, spark] = await Promise.all([
      fetchCount(p.name, `2025-01-01:${today}`),
      fetchSpark(p.name, 30),
    ]);
    const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);
    const lastMonth = sum(spark);
    const lastWeek = sum(spark.slice(-7));
    const lastDay = spark[spark.length - 1] || 0;
    return {
      name: p.name,
      version: p.version,
      published: p.date.slice(0, 10),
      description: p.description,
      lifetime,
      lastMonth,
      lastWeek,
      lastDay,
      spark,
    };
  });

  rows.sort((a, b) => b.lifetime - a.lifetime);
  const totals = rows.reduce(
    (t, r) => ({
      lifetime: t.lifetime + r.lifetime,
      lastMonth: t.lastMonth + r.lastMonth,
      lastWeek: t.lastWeek + r.lastWeek,
      lastDay: t.lastDay + r.lastDay,
    }),
    { lifetime: 0, lastMonth: 0, lastWeek: 0, lastDay: 0 }
  );

  return {
    username,
    fetchedAt: new Date().toISOString(),
    packages: rows,
    totals,
  };
}
