import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap">
      <nav className="nav">
        <Link href="/" className="mark" style={{ textDecoration: 'none' }}>pkgfolio</Link>
        <span className="meta">404</span>
      </nav>
      <section className="landing-hero">
        <h1 className="display">No packages found.</h1>
        <p className="lead">
          That npm username either doesn't exist or doesn't maintain any published packages yet.
        </p>
        <div className="shortcuts">
          <Link href="/">← back to pkgfolio</Link>
        </div>
      </section>
    </div>
  );
}
