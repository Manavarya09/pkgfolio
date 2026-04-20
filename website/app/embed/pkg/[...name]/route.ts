import { NextRequest } from 'next/server';
import { CACHE_HEADERS, CARD_STYLE, errorSvg, fmt, sparkPath, xmlEscape } from '@/lib/embed';

export const revalidate = 1800; // 30 minutes

const POINT_URL = 'https://api.npmjs.org/downloads/point';
const RANGE_URL = 'https://api.npmjs.org/downloads/range';

async function getJson<T>(url: string, retries = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } });
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

export async function GET(_req: NextRequest, { params }: { params: { name: string[] } }) {
  const pkgName = (params.name || []).map(decodeURIComponent).join('/');
  if (!pkgName) return errorSvg('no package specified');

  const today = new Date().toISOString().slice(0, 10);
  const startLifetime = '2025-01-01';
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 86400000);
  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

  const [lifetimeRes, rangeRes] = await Promise.all([
    getJson<{ downloads: number }>(`${POINT_URL}/${startLifetime}:${today}/${pkgName}`),
    getJson<{ downloads: Array<{ downloads: number }> }>(`${RANGE_URL}/${fmtDate(start)}:${fmtDate(end)}/${pkgName}`),
  ]);

  if (!lifetimeRes && !rangeRes) {
    return errorSvg(`package not found: ${pkgName}`);
  }

  const lifetime = lifetimeRes?.downloads || 0;
  const daily = (rangeRes?.downloads || []).map((d) => d.downloads);
  const last30 = daily.reduce((s, n) => s + n, 0);
  const last7 = daily.slice(-7).reduce((s, n) => s + n, 0);
  const today1 = daily[daily.length - 1] || 0;

  const W = 560;
  const H = 200;
  const spark = sparkPath(daily, 320, 46, 30);

  const safeName = xmlEscape(pkgName);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="npm downloads for ${safeName}">
  <style>${CARD_STYLE}</style>
  <rect width="${W}" height="${H}" fill="#FFFFFF" stroke="#d9d5c9"/>

  <text class="label" x="24" y="32" style="font-size:10px">NPM · DOWNLOADS</text>
  <line class="rule" x1="24" y1="46" x2="${W - 24}" y2="46"/>

  <text class="big" x="24" y="100" style="font-size:54px">${fmt(lifetime)}</text>
  <text class="sub" x="24" y="128" style="font-size:16px">${safeName}</text>

  <g transform="translate(${W - 344}, 66)">
    <path class="spark" d="${spark}"/>
    <line class="rule" x1="0" y1="52" x2="320" y2="52"/>
    <g style="font-size:10px" class="label">
      <text x="0"   y="70">30D</text>
      <text x="110" y="70">7D</text>
      <text x="210" y="70">1D</text>
    </g>
    <g style="font-size:14px" class="val">
      <text x="0"   y="92">${fmt(last30)}</text>
      <text x="110" y="92">${fmt(last7)}</text>
      <text x="210" y="92">${fmt(today1)}</text>
    </g>
  </g>

  <line class="rule" x1="24" y1="${H - 36}" x2="${W - 24}" y2="${H - 36}"/>
  <text class="mark" x="24" y="${H - 16}">PKGFOLIO</text>
  <text class="mark" x="${W - 24}" y="${H - 16}" text-anchor="end">PKGFOLIO.VERCEL.APP</text>
</svg>`;

  return new Response(svg, { headers: CACHE_HEADERS });
}
