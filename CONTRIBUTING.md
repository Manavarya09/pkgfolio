# Contributing to pkgfolio

Thanks for your interest. pkgfolio is small on purpose — the goal is "one command, one page, every package you maintain" — so contributions that sharpen that focus are the most welcome.

## Ways to contribute

- **Bug reports** — especially anything inaccurate in the totals (lifetime, range, or sparklines).
- **Feature requests** — open an issue with a concrete use case before writing code.
- **Code** — pick any unchecked item from the roadmap in the README, or fix an existing issue.
- **Design** — the site is deliberately typography-forward (serif display, no icons). If you improve the aesthetic without adding chrome, that's a win.
- **Docs** — if a sentence was unclear to you, it's unclear to the next person.

## Development setup

```bash
git clone https://github.com/Manavarya09/pkgfolio
cd pkgfolio
npm install             # root deps for the CLI
node bin/cli.js <username>

# Website
cd website
npm install
npm run dev             # opens on http://localhost:3042
```

Requires Node 18+.

## Project layout

```
bin/cli.js                      — the CLI
website/
  app/
    page.tsx                    — landing
    u/[username]/
      page.tsx                  — portfolio (server component)
      FilterBar.tsx             — shortcut chips + date picker (client)
    layout.tsx
    globals.css                 — design system (monochrome + Fraunces)
  lib/npm.ts                    — shared npm registry client + cache
  public/{brand,logo}.svg      — brand assets
brand.svg / logo.svg           — same assets at repo root for GitHub README
```

## Code style

- TypeScript on the website, modern JavaScript (ES modules) in the CLI.
- No unnecessary dependencies — if your PR adds a package to `dependencies`, the PR description needs to explain why nothing simpler works.
- Keep the website dependency-free beyond Next.js + React. We do not use UI libraries, icon packs, or CSS-in-JS runtimes. All styling lives in `globals.css`.
- No emojis or icon components in rendered UI. The visual identity is typographic.
- The CLI is output-on-stdout, colors via `chalk`, no interactive prompts.

## What will not be merged

- UI reskins that add emojis, logos, or icon glyphs.
- Analytics or tracking, anywhere.
- Features that require an API key, login, or user account. pkgfolio is meant to work with zero setup.
- Anything that moves the data source off the public [npm Downloads API](https://github.com/npm/registry/blob/main/docs/download-counts.md).

## Submitting a PR

1. Open an issue first for anything bigger than a one-line fix.
2. Keep PRs small and focused. One feature or fix per PR.
3. Commit messages: short imperative subject, optional body that explains *why* (not *what* — the diff shows *what*).
4. If you add or change behavior, add a line to the README if it's user-facing.
5. Be kind in review. Be direct, but kind.

## License

By contributing, you agree your contributions are licensed under the MIT License (see [LICENSE](LICENSE)).
