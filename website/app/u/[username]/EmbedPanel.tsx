'use client';

import { useState } from 'react';

type Props = {
  username: string;
  packages: Array<{ name: string; rangeTotal: number; lifetime: number }>;
};

export default function EmbedPanel({ username, packages }: Props) {
  const [activeTab, setActiveTab] = useState<'user' | 'pkg'>('user');
  const [pkg, setPkg] = useState(packages[0]?.name || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pkgfolio.vercel.app';

  const userEmbed = `${baseUrl}/embed/u/${encodeURIComponent(username)}`;
  const pkgEmbed = pkg ? `${baseUrl}/embed/pkg/${pkg.split('/').map(encodeURIComponent).join('/')}` : '';

  const activeUrl = activeTab === 'user' ? userEmbed : pkgEmbed;
  const activeAlt = activeTab === 'user' ? `npm downloads for @${username}` : `npm downloads for ${pkg}`;

  const markdown = activeUrl ? `[![${activeAlt}](${activeUrl})](https://pkgfolio.vercel.app/u/${encodeURIComponent(username)})` : '';
  const html = activeUrl ? `<a href="https://pkgfolio.vercel.app/u/${encodeURIComponent(username)}"><img src="${activeUrl}" alt="${activeAlt}" /></a>` : '';

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1600);
    } catch { /* ignore */ }
  }

  return (
    <section className="embed-panel">
      <div className="embed-head">
        <div>
          <div className="eyebrow">embed in your github readme</div>
          <h2 className="embed-title">Put this card on any README.</h2>
        </div>

        <div className="embed-tabs">
          <button type="button" className={`chip${activeTab === 'user' ? ' active' : ''}`} onClick={() => setActiveTab('user')}>PORTFOLIO</button>
          <button type="button" className={`chip${activeTab === 'pkg' ? ' active' : ''}`} onClick={() => setActiveTab('pkg')}>PACKAGE</button>
        </div>
      </div>

      {activeTab === 'pkg' && (
        <div className="embed-pkg-pick">
          <label className="k">PACKAGE</label>
          <select value={pkg} onChange={(e) => setPkg(e.target.value)}>
            {packages.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="embed-preview">
        {/* Rendered live from the SVG endpoint — the real thing. */}
        {activeUrl && <img src={activeUrl} alt="embed preview" />}
      </div>

      <div className="embed-snippets">
        <div className="snippet">
          <div className="snippet-head">
            <span className="k">MARKDOWN</span>
            <button type="button" className="copy-btn" onClick={() => copy('md', markdown)}>
              {copiedField === 'md' ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <pre><code>{markdown}</code></pre>
        </div>

        <div className="snippet">
          <div className="snippet-head">
            <span className="k">HTML</span>
            <button type="button" className="copy-btn" onClick={() => copy('html', html)}>
              {copiedField === 'html' ? 'COPIED' : 'COPY'}
            </button>
          </div>
          <pre><code>{html}</code></pre>
        </div>
      </div>
    </section>
  );
}
