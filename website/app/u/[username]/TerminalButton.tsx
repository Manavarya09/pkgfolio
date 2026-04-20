'use client';

import { useState } from 'react';

export default function TerminalButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const cmd = `npx pkgfolio ${username}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <button type="button" className={`term on-cream${copied ? ' copied' : ''}`} onClick={copy} aria-label="Copy CLI command">
      <span className="prompt">$</span>
      <span className="cmd">{cmd}</span>
      <span className="copy-label">{copied ? 'COPIED' : 'COPY'}</span>
    </button>
  );
}
