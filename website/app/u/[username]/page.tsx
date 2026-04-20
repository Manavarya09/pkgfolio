import { fetchPortfolio, parseRange, type Pkg } from '@/lib/npm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FilterBar from './FilterBar';
import TerminalButton from './TerminalButton';

export const revalidate = 600;

function fmt(n: number) { return n.toLocaleString(); }

function sparkPath(values: number[], w: number, h: number) {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${pts.join(' L')}`;
}

function Card({ p, rank, lead, rangeLabel }: { p: Pkg; rank: number; lead: boolean; rangeLabel: string }) {
  const description = p.description || '—';
  const sparkD = sparkPath(p.spark, 300, 52);
  return (
    <article className={`card${lead ? ' lead' : ''}`}>
      <div className="top">
        <h3>{p.name}</h3>
        <span className="ver">v{p.version}</span>
      </div>

      <div>
        <div className="rank">№ {String(rank).padStart(2, '0')} · {rangeLabel.toLowerCase()}</div>
        <div className="big">{fmt(p.rangeTotal)}</div>
      </div>

      <p className="lede" style={{ margin: 0 }}>
        {description.length > 120 ? description.slice(0, 120) + '…' : description}
      </p>

      {p.spark.length > 0 && (
        <svg className="spark" viewBox="0 0 300 52" preserveAspectRatio="none" aria-hidden>
          <path d={sparkD} fill="none" stroke="var(--ink)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      <div className="stats">
        <div><div className="k">lifetime</div><div className="v">{fmt(p.lifetime)}</div></div>
        <div><div className="k">days</div><div className="v">{p.rangeDays}</div></div>
        <div><div className="k">per day</div><div className="v">{p.rangeDays ? fmt(Math.round(p.rangeTotal / p.rangeDays)) : '—'}</div></div>
      </div>
    </article>
  );
}

export async function generateMetadata({ params }: { params: { username: string } }) {
  return {
    title: `${params.username} — pkgfolio`,
    description: `The npm package portfolio of @${params.username}.`,
  };
}

export default async function UserPage({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { range?: string };
}) {
  const range = parseRange(searchParams.range);
  const portfolio = await fetchPortfolio(params.username, range);
  if (!portfolio.packages || portfolio.packages.length === 0) notFound();

  return (
    <div className="wrap">
      <nav className="nav">
        <Link href="/" className="mark" style={{ textDecoration: 'none' }}>pkgfolio</Link>
        <span className="meta">
          fetched {new Date(portfolio.fetchedAt).toUTCString().slice(5, 16)}
        </span>
      </nav>

      <header className="dash-head">
        <div>
          <div className="eyebrow">portfolio of</div>
          <h1>@{params.username}</h1>
        </div>
        <div className="rank">
          {portfolio.packages.length} package{portfolio.packages.length === 1 ? '' : 's'}
        </div>
      </header>

      <FilterBar activeKey={range.key} start={range.start} end={range.end} />

      <TerminalButton username={params.username} />

      <div className="totals">
        <div>
          <div className="k">lifetime</div>
          <div className="v">{fmt(portfolio.totals.lifetime)}</div>
        </div>
        <div>
          <div className="k">{range.label.toLowerCase()}</div>
          <div className="v">{fmt(portfolio.totals.rangeTotal)}</div>
        </div>
        <div>
          <div className="k">packages</div>
          <div className="v">{portfolio.packages.length}</div>
        </div>
        <div>
          <div className="k">per day (avg)</div>
          <div className="v">
            {(() => {
              const days = Math.max(
                1,
                Math.round((new Date(range.end).getTime() - new Date(range.start).getTime()) / 86400000) + 1
              );
              return fmt(Math.round(portfolio.totals.rangeTotal / days));
            })()}
          </div>
        </div>
      </div>

      <section className="masonry">
        {portfolio.packages.map((p, i) => (
          <Card key={p.name} p={p} rank={i + 1} lead={i === 0} rangeLabel={range.label} />
        ))}
      </section>

      <footer className="footer">
        <span>
          data: registry.npmjs.org · cached 10 min · range: {range.start} → {range.end}
        </span>
        <span>
          <Link href="/" style={{ color: 'inherit' }}>← another portfolio</Link>
        </span>
      </footer>
    </div>
  );
}
