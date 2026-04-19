'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';

type Shortcut = { key: string; label: string };

const SHORTCUTS: Shortcut[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'ALL' },
];

export default function FilterBar({ activeKey, start, end }: { activeKey: string; start: string; end: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [showCustom, setShowCustom] = useState(activeKey === 'custom');
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);

  useEffect(() => {
    if (activeKey === 'custom') {
      setFrom(start);
      setTo(end);
      setShowCustom(true);
    }
  }, [activeKey, start, end]);

  function apply(range: string) {
    const next = new URLSearchParams(params.toString());
    next.set('range', range);
    startTransition(() => {
      router.replace(`?${next.toString()}`, { scroll: false });
    });
  }

  function applyCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    if (new Date(from) > new Date(to)) return;
    apply(`${from}:${to}`);
  }

  return (
    <div className={`filterbar${isPending ? ' pending' : ''}`}>
      <div className="shortcuts-row">
        {SHORTCUTS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`chip${activeKey === s.key ? ' active' : ''}`}
            onClick={() => { setShowCustom(false); apply(s.key); }}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          className={`chip${activeKey === 'custom' ? ' active' : ''}`}
          onClick={() => setShowCustom((v) => !v)}
          aria-expanded={showCustom}
        >
          CUSTOM
        </button>
      </div>

      {showCustom && (
        <form className="custom-range" onSubmit={applyCustom}>
          <label>
            <span className="k">FROM</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
          </label>
          <label>
            <span className="k">TO</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} />
          </label>
          <button type="submit" className="apply">Apply</button>
        </form>
      )}
    </div>
  );
}
