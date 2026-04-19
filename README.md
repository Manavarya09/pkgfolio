<p align="center">
  <strong>pkgfolio</strong>
</p>

<p align="center">
  <em>Your npm package portfolio — in one command, or one page.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pkgfolio"><img src="https://img.shields.io/npm/v/pkgfolio?color=0A0908&labelColor=F3F1EA&label=npm" alt="npm version"></a>
  <a href="https://github.com/Manavarya09/pkgfolio/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Manavarya09/pkgfolio?color=0A0908&labelColor=F3F1EA" alt="license"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/pkgfolio?color=0A0908&labelColor=F3F1EA" alt="node version"></a>
  <a href="https://www.npmjs.com/package/pkgfolio"><img src="https://img.shields.io/npm/dm/pkgfolio?color=0A0908&labelColor=F3F1EA&label=downloads" alt="downloads"></a>
</p>

---

npm shows each package in isolation. Your actual distribution lives across *all* of them. **pkgfolio** adds them up.

```bash
npx pkgfolio <your-npm-username>
```

```
  pkgfolio  @manavarya0909

  Package                         Ever      30d       7d    1d   Last 30d
  ────────────────────────────────────────────────────────────────────────
  designlang                    1,987     1,987    1,987    0   ▁▁▁▁▁▁▁█▅▃▆▁
  ai-design-skills              1,254     1,254       19    0   ▁▁█▁▁▁▁▁▁▁▁▁
  moldui                        1,213     1,213    1,213    0   ▁▁▁▁▁▁▁▁▁█▅▁
  @manavarya0909/ui-forge-cli   1,022       894       14    0   ██▂▃▁▁▁▁▁▁▁▁
  @masyv/relay                    829       829        6    0   ▁▁▁▁▁▁▁▁▁█▁▁
  …
  ────────────────────────────────────────────────────────────────────────
  TOTAL                         9,437     9,148    3,308    0

  17 packages · 9,437 lifetime downloads
```

## Install

```bash
# one-off, no install
npx pkgfolio <username>

# or install globally
npm install -g pkgfolio
pkgfolio sindresorhus
```

Requires Node 18+.

## Web

[**pkgfolio.vercel.app**](https://pkgfolio.vercel.app) is a Pinterest-style portfolio view of the same data. Paste any npm username, get a masonry grid of every package they ship — sorted by lifetime downloads, with sparklines, rendered in a typography-forward, high-class layout (serif display, monochrome palette, no icons, no emojis).

**Time-range filters:** every portfolio page has shortcut chips — `7D · 30D · 90D · 6M · 1Y · ALL` — plus a `CUSTOM` option that reveals two date pickers. The URL reflects the filter (`?range=90d`, `?range=2026-01-01:2026-04-20`), so any view is shareable as a link. Cards re-sort by downloads in the selected range; the "lifetime" card and total are always shown alongside.

The web app is in [`website/`](website/). It's a Next.js App Router site deployed on Vercel.

## How it works

1. Queries [`registry.npmjs.org/-/v1/search`](https://registry.npmjs.org/-/v1/search) for every package where the target username is a maintainer (paginated to 1,250 packages).
2. For each package, fetches two things in parallel:
   - **Lifetime downloads** — one point query: `api.npmjs.org/downloads/point/2025-01-01:<today>/<pkg>`.
   - **Daily series for the selected range** — one range query: `api.npmjs.org/downloads/range/<start>:<end>/<pkg>`. For wide ranges (>500 days) the window is chunked and concatenated.
3. The range total, "per day" average, and sparkline are all derived from that one daily array — no extra requests per filter shortcut.
4. Four packages concurrent, retries with backoff on `429` / `1015` (Cloudflare rate-limit), sorted by range total, rendered.

A typical 17-package portfolio finishes in **under 5 seconds** with no API key and no signup. The dashboard cache is 10 min per `(username, range)` pair.

## Repo layout

```
bin/
  cli.js           ← the CLI

website/
  app/
    page.tsx         ← landing (URL form)
    u/[username]/
      page.tsx       ← the portfolio dashboard
      not-found.tsx
    layout.tsx
    globals.css      ← monochrome + serif design system
  lib/
    npm.ts           ← shared npm registry client
  next.config.mjs
  tsconfig.json
```

## Develop

```bash
git clone https://github.com/Manavarya09/pkgfolio
cd pkgfolio

# CLI
npm install
node bin/cli.js <username>

# Website
cd website
npm install
npm run dev   # opens on :3042
```

## Roadmap

- [ ] Pin your portfolio with a shareable card (`/u/<username>/card.png`).
- [ ] Compare two maintainers side-by-side (`/compare/a-vs-b`).
- [ ] Weekly email digest (opt-in, one line: "+12% on your portfolio this week").
- [ ] Organization view (`/org/<org-name>`).
- [ ] Historical chart beyond 30 days.
- [ ] JSON API — `GET /api/u/<username>` — same payload, programmatic.

## Credits

Built by [@Manavarya09](https://github.com/Manavarya09). Data from the public [npm Downloads API](https://github.com/npm/registry/blob/main/docs/download-counts.md).

Inspired by every maintainer who's ever opened five npm pages in five tabs just to add up their own numbers.

## License

[MIT](LICENSE)
