'use client';

import { useState } from 'react';

export default function CopyEmbedButton({ pkgName }: { pkgName: string }) {
  const [copied, setCopied] = useState(false);

  const encoded = pkgName.split('/').map(encodeURIComponent).join('/');
  const src = `https://pkgfolio.vercel.app/embed/pkg/${encoded}`;
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
