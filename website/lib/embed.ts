// Shared helpers for the SVG embed routes. Keep output minimal, monochrome,
// and dependency-free so browsers / GitHub's image proxy render consistently.

export function fmt(n: number) {
  return n.toLocaleString('en-US');
}

// Down-sample a daily series into N evenly-weighted buckets, then return an
// SVG path string normalised to the given width/height. Used for sparklines.
export function sparkPath(values: number[], width: number, height: number, buckets = 40) {
  if (!values.length) return '';
  const bucketed: number[] = [];
  if (values.length <= buckets) {
    bucketed.push(...values);
  } else {
    const size = Math.ceil(values.length / buckets);
    for (let i = 0; i < values.length; i += size) {
      const slice = values.slice(i, i + size);
      bucketed.push(slice.reduce((s, v) => s + v, 0));
    }
  }
  const max = Math.max(...bucketed, 1);
  const step = width / Math.max(bucketed.length - 1, 1);
  const pts = bucketed.map((v, i) => {
    const x = i * step;
    const y = height - (v / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${pts.join(' L')}`;
}

// Escape XML special chars so package names with < > & etc render safely.
export function xmlEscape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// CSS block shared by every card. Embeds @import so the SVG looks right when
// hosted at pkgfolio.vercel.app — on GitHub READMEs the cards fall back to
// Times New Roman / ui-monospace, which the spacing is designed around.
export const CARD_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400&family=JetBrains+Mono:wght@400;500&display=swap');
  .big { font-family: 'Fraunces','Times New Roman',serif; font-weight: 300; letter-spacing: -0.03em; fill: #0A0908; }
  .label { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-weight: 500; letter-spacing: 0.14em; fill: #7a7872; }
  .val { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-weight: 500; fill: #0A0908; }
  .sub { font-family: 'Fraunces','Times New Roman',serif; font-style: italic; font-weight: 300; fill: #3b3a36; }
  .rule { stroke: #d9d5c9; stroke-width: 1; }
  .spark { stroke: #0A0908; stroke-width: 1.4; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .mark { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: 0.16em; fill: #7a7872; }
`;

// Cache header that tells GitHub's Camo image proxy and browsers to hold
// the SVG for a reasonable time but stay fresh within the hour.
export const CACHE_HEADERS = {
  'content-type': 'image/svg+xml; charset=utf-8',
  'cache-control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
};

export function errorSvg(message: string, width = 540, height = 160) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>${CARD_STYLE}</style>
  <rect width="${width}" height="${height}" fill="#FFFFFF" stroke="#d9d5c9"/>
  <text class="label" x="24" y="40" style="font-size:11px">PKGFOLIO · ERROR</text>
  <text class="big" x="24" y="92" style="font-size:28px">${xmlEscape(message)}</text>
  <text class="mark" x="${width - 24}" y="${height - 20}" text-anchor="end">PKGFOLIO.VERCEL.APP</text>
</svg>`;
  return new Response(svg, { headers: { ...CACHE_HEADERS, 'cache-control': 'no-store' } });
}
