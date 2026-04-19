# pkgfolio

Your npm package portfolio. Lifetime and recent downloads across every package you maintain, in one command or one page.

```bash
npx pkgfolio manavarya0909
```

```
  pkgfolio  @manavarya0909

  Package                         Ever      30d       7d    1d   Last 30d
  ────────────────────────────────────────────────────────────────────────
  designlang                   1,987    1,987    1,987   507   ▁▁▁▁▁▁▁█▅▃
  ai-design-skills             1,254    1,254       19     1   ▁▁█▁▁▁▁▁▁▁
  moldui                       1,213    1,213    1,213    47   ▁▁▁▁▁▁▁▁▁█
  @manavarya0909/ui-forge-cli  1,022    1,022       16     2   ██▂▃▁▁▁▁▁▁
  …
  ────────────────────────────────────────────────────────────────────────
  TOTAL                       10,641   10,641    3,659   571

  17 packages · 10,641 lifetime downloads
```

## Why

npm shows each package in isolation. Your actual distribution lives across *all* of them. `pkgfolio` adds them up.

## Web

[pkgfolio.dev](https://pkgfolio.dev) is a Pinterest-style portfolio view of the same data. Paste your username, get a masonry grid of every package you ship, sorted by lifetime downloads, with 30-day sparklines.

## Install / run

```bash
# one-off
npx pkgfolio <your-npm-username>

# global
npm install -g pkgfolio
pkgfolio sindresorhus
```

## Repo layout

```
bin/cli.js     — the CLI
website/       — the Next.js app (pkgfolio.dev)
```

## Develop

```bash
git clone https://github.com/Manavarya09/pkgfolio
cd pkgfolio
npm install
node bin/cli.js manavarya0909

# Website
cd website && npm install && npm run dev
```

## License

MIT
