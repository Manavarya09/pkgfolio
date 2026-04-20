import { NextRequest } from 'next/server';
import { CACHE_HEADERS, S, errorSvg, fmt, sparkPath, xmlEscape } from '@/lib/embed';
import { fetchPortfolio, parseRange } from '@/lib/npm';

export const revalidate = 1800;

export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  const username = decodeURIComponent(params.username || '');
  if (!username) return errorSvg('no username');

  const range = parseRange(req.nextUrl.searchParams.get('range') || '30d');

  const portfolio = await fetchPortfolio(username, range).catch(() => null);
  if (!portfolio || portfolio.packages.length === 0) {
    return errorSvg(`no packages for @${username}`);
  }

  // Sum daily arrays across packages to get a portfolio-wide sparkline.
  const dayMap = new Map<number, number>();
  for (const p of portfolio.packages) {
    p.spark.forEach((v, i) => dayMap.set(i, (dayMap.get(i) || 0) + v));
  }
  const totalDaily = [...dayMap.keys()].sort((a, b) => a - b).map((k) => dayMap.get(k) || 0);

  const W = 560;
  const H = 200;
  const spark = sparkPath(totalDaily, 320, 46, 30);
  const safeUser = xmlEscape(username);

  const label = `${S.mono};font-size:10px;font-weight:600;letter-spacing:0.14em;fill:#7a7872`;
  const big   = `${S.serif};font-size:54px;font-weight:400;letter-spacing:-0.02em;fill:#0A0908`;
  const sub   = `${S.serif};font-size:16px;font-style:italic;fill:#3b3a36`;
  const val   = `${S.mono};font-size:14px;font-weight:600;fill:#0A0908`;
  const mark  = `${S.mono};font-size:10px;letter-spacing:0.16em;fill:#7a7872`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="pkgfolio stats for ${safeUser}">
  <rect width="${W}" height="${H}" fill="#FFFFFF" stroke="#d9d5c9"/>

  <text x="24" y="32" style="${label}">PKGFOLIO · NPM PORTFOLIO</text>
  <line x1="24" y1="46" x2="${W - 24}" y2="46" stroke="#d9d5c9" stroke-width="1"/>

  <text x="24" y="100" style="${big}">${fmt(portfolio.totals.lifetime)}</text>
  <text x="24" y="128" style="${sub}">@${safeUser} · ${portfolio.packages.length} packages</text>

  <g transform="translate(${W - 344}, 66)">
    <path d="${spark}" fill="none" stroke="#0A0908" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="0" y1="52" x2="320" y2="52" stroke="#d9d5c9" stroke-width="1"/>
    <text x="0"   y="70" style="${label}">LIFETIME</text>
    <text x="120" y="70" style="${label}">IN RANGE</text>
    <text x="240" y="70" style="${label}">RANGE</text>
    <text x="0"   y="92" style="${val}">${fmt(portfolio.totals.lifetime)}</text>
    <text x="120" y="92" style="${val}">${fmt(portfolio.totals.rangeTotal)}</text>
    <text x="240" y="92" style="${val};font-size:12px">${xmlEscape(range.key.toUpperCase())}</text>
  </g>

  <line x1="24" y1="${H - 36}" x2="${W - 24}" y2="${H - 36}" stroke="#d9d5c9" stroke-width="1"/>
  <text x="24" y="${H - 16}" style="${mark}">PKGFOLIO</text>
  <text x="${W - 24}" y="${H - 16}" text-anchor="end" style="${mark}">PKGFOLIO.VERCEL.APP</text>
</svg>`;

  return new Response(svg, { headers: CACHE_HEADERS });
}
