'use client';

import { useState } from 'react';

export default function CopyEmbedButton({ pkgName }: { pkgName: string }) {
  const [copied, setCopied] = useState(false);

  const encoded = pkgName.split('/').map(encodeURIComponent).join('/');
  // ?v=2 is a cache-bust marker for GitHub's Camo image proxy. It was holding
  // a broken version of the SVG from before the inline-styles fix on
  // 2026-04-20 — the query string forces Camo to refetch. The route handler
  // ignores it. Bump when the SVG renderer changes meaningfully.
  const src = `https://pkgfolio.vercel.app/embed/pkg/${encoded}?v=2`;
  const href = `https://www.npmjs.com/package/${pkgName}`;
  const markdown = `[![${pkgName} on npm](${src})](${href})`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <button
      type="button"
      className={`copy-badge${copied ? ' copied' : ''}`}
      onClick={copy}
      aria-label={`Copy README badge for ${pkgName}`}
      title="Copy markdown for your README"
    >
      {copied ? 'COPIED' : 'COPY README BADGE'}
    </button>
  );
}
