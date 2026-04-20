'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Landing() {
  const router = useRouter();
  const [u, setU] = useState('');
  const [copied, setCopied] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = u.trim().replace(/^@/, '');
    if (clean) router.push(`/u/${clean}`);
  }

  const npxCmd = u.trim() ? `npx pkgfolio ${u.trim().replace(/^@/, '')}` : 'npx pkgfolio <username>';

  async function copyCmd() {
    try {
      await navigator.clipboard.writeText(npxCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <span className="mark">pkgfolio</span>
        <span className="meta">v0.1 — npm package portfolios</span>
      </nav>

      <section className="landing-hero">
        <h1 className="display">A portfolio<br />for your npm work.</h1>
        <p className="lead">
          Every package you maintain, the lifetime downloads, the 30-day sparkline, the one
          total you never see — on one page.
        </p>

        <form className="form" onSubmit={submit}>
          <input
            autoFocus
            placeholder="your npm username"
            value={u}
            onChange={(e) => setU(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
          />
          <button type="submit">Open portfolio</button>
        </form>

        <div className="or-terminal">
          <span className="or-line" aria-hidden />
          <span className="or-label">OR IN YOUR TERMINAL</span>
          <span className="or-line" aria-hidden />
        </div>

        <button type="button" className={`term${copied ? ' copied' : ''}`} onClick={copyCmd} aria-label="Copy npx command">
          <span className="prompt">$</span>
          <span className="cmd">{npxCmd}</span>
          <span className="copy-label">{copied ? 'COPIED' : 'COPY'}</span>
        </button>

        <div className="shortcuts">
          Try:
          {' '}
          <a href="/u/manavarya0909">manavarya0909</a>
          <a href="/u/sindresorhus">sindresorhus</a>
          <a href="/u/vercel">vercel</a>
        </div>
      </section>

      <section className="landing-grid">
        <div className="cell">
          <div className="eyebrow">01 — the gap</div>
          <h3 className="display">npm shows each package in isolation.</h3>
          <p>Your actual distribution lives across all of them. That total is what matters to you, not the per-package graph.</p>
        </div>
        <div className="cell">
          <div className="eyebrow">02 — the fix</div>
          <h3 className="display">One page, one total, every package.</h3>
          <p>Search once. See every package you maintain, sorted by lifetime downloads, with a 30-day sparkline and the numbers that matter.</p>
        </div>
        <div className="cell">
          <div className="eyebrow">03 — the tool</div>
          <h3 className="display">Same data, in your terminal.</h3>
          <p>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              npx pkgfolio &lt;username&gt;
            </code>
            {' '}runs the same query and prints it as a compact table. No signup, no token, no install.
          </p>
        </div>
      </section>

      <footer className="footer">
        <span>pkgfolio · MIT</span>
        <span>
          <a href="https://github.com/Manavarya09/pkgfolio" style={{ color: 'inherit' }}>
            github.com/Manavarya09/pkgfolio
          </a>
        </span>
      </footer>
    </div>
  );
}
