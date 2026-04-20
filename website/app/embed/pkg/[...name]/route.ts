import { NextRequest } from 'next/server';
import { CACHE_HEADERS, S, errorSvg, fmt, sparkPath, xmlEscape } from '@/lib/embed';

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

  const label = `${S.mono};font-size:10px;font-weight:600;letter-spacing:0.14em;fill:#7a7872`;
  const big   = `${S.serif};font-size:54px;font-weight:400;letter-spacing:-0.02em;fill:#0A0908`;
  const sub   = `${S.serif};font-size:16px;font-style:italic;fill:#3b3a36`;
  const val   = `${S.mono};font-size:14px;font-weight:600;fill:#0A0908`;
  const mark  = `${S.mono};font-size:10px;letter-spacing:0.16em;fill:#7a7872`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="npm downloads for ${safeName}">
  <rect width="${W}" height="${H}" fill="#FFFFFF" stroke="#d9d5c9"/>

  <text x="24" y="32" style="${label}">NPM · DOWNLOADS</text>
  <line x1="24" y1="46" x2="${W - 24}" y2="46" stroke="#d9d5c9" stroke-width="1"/>

  <text x="24" y="100" style="${big}">${fmt(lifetime)}</text>
  <text x="24" y="128" style="${sub}">${safeName}</text>

  <g transform="translate(${W - 344}, 66)">
    <path d="${spark}" fill="none" stroke="#0A0908" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="0" y1="52" x2="320" y2="52" stroke="#d9d5c9" stroke-width="1"/>
    <text x="0"   y="70" style="${label}">30D</text>
    <text x="110" y="70" style="${label}">7D</text>
    <text x="210" y="70" style="${label}">1D</text>
    <text x="0"   y="92" style="${val}">${fmt(last30)}</text>
    <text x="110" y="92" style="${val}">${fmt(last7)}</text>
    <text x="210" y="92" style="${val}">${fmt(today1)}</text>
  </g>

  <line x1="24" y1="${H - 36}" x2="${W - 24}" y2="${H - 36}" stroke="#d9d5c9" stroke-width="1"/>
  <text x="24" y="${H - 16}" style="${mark}">PKGFOLIO</text>
  <text x="${W - 24}" y="${H - 16}" text-anchor="end" style="${mark}">PKGFOLIO.VERCEL.APP</text>
</svg>`;

  return new Response(svg, { headers: CACHE_HEADERS });
}
