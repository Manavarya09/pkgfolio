// Shared helpers for the SVG embed routes. Intentionally generates SVGs with
// NO <style> block and NO @import: GitHub's Camo image proxy sanitises those
// aggressively and was making cards render as a broken-image icon in
// READMEs. Every style is inline.

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

// Reusable inline style strings. Times and ui-monospace are universally
// available, so these render identically on github.com, VS Code markdown
// preview, and any browser.
export const S = {
  serif: "font-family:'Times New Roman',Georgia,serif",
  mono:  "font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace",
};

export const CACHE_HEADERS = {
  'content-type': 'image/svg+xml; charset=utf-8',
  'cache-control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
};

export function errorSvg(message: string, width = 560, height = 160) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#FFFFFF" stroke="#d9d5c9"/>
  <text x="24" y="40" style="${S.mono};font-size:11px;font-weight:600;letter-spacing:0.14em;fill:#7a7872">PKGFOLIO · ERROR</text>
  <text x="24" y="92" style="${S.serif};font-size:28px;font-weight:400;letter-spacing:-0.02em;fill:#0A0908">${xmlEscape(message)}</text>
  <text x="${width - 24}" y="${height - 20}" text-anchor="end" style="${S.mono};font-size:10px;letter-spacing:0.16em;fill:#7a7872">PKGFOLIO.VERCEL.APP</text>
</svg>`;
  return new Response(svg, { headers: { ...CACHE_HEADERS, 'cache-control': 'no-store' } });
}
