import { NextRequest } from 'next/server';
import { CACHE_HEADERS, CARD_STYLE, errorSvg, fmt, sparkPath, xmlEscape } from '@/lib/embed';
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="pkgfolio stats for ${safeUser}">
  <style>${CARD_STYLE}</style>
  <rect width="${W}" height="${H}" fill="#FFFFFF" stroke="#d9d5c9"/>

  <text class="label" x="24" y="32" style="font-size:10px">PKGFOLIO · NPM PORTFOLIO</text>
  <line class="rule" x1="24" y1="46" x2="${W - 24}" y2="46"/>

  <text class="big" x="24" y="100" style="font-size:54px">${fmt(portfolio.totals.lifetime)}</text>
  <text class="sub" x="24" y="128" style="font-size:16px">@${safeUser} · ${portfolio.packages.length} packages</text>

  <g transform="translate(${W - 344}, 66)">
    <path class="spark" d="${spark}"/>
    <line class="rule" x1="0" y1="52" x2="320" y2="52"/>
    <g style="font-size:10px" class="label">
      <text x="0"   y="70">LIFETIME</text>
      <text x="120" y="70">IN RANGE</text>
      <text x="240" y="70">RANGE</text>
    </g>
    <g style="font-size:14px" class="val">
      <text x="0"   y="92">${fmt(portfolio.totals.lifetime)}</text>
      <text x="120" y="92">${fmt(portfolio.totals.rangeTotal)}</text>
      <text x="240" y="92" style="font-size:12px">${xmlEscape(range.key.toUpperCase())}</text>
    </g>
  </g>

  <line class="rule" x1="24" y1="${H - 36}" x2="${W - 24}" y2="${H - 36}"/>
  <text class="mark" x="24" y="${H - 16}">PKGFOLIO</text>
  <text class="mark" x="${W - 24}" y="${H - 16}" text-anchor="end">PKGFOLIO.VERCEL.APP</text>
</svg>`;

  return new Response(svg, { headers: CACHE_HEADERS });
}
