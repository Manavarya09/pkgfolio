#!/usr/bin/env node
import chalk from 'chalk';

const SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const POINT_URL = 'https://api.npmjs.org/downloads/point';

async function findPackages(username) {
  const pkgs = [];
  let from = 0;
  const size = 250;
  while (true) {
    const r = await fetch(`${SEARCH_URL}?text=maintainer:${encodeURIComponent(username)}&size=${size}&from=${from}`);
    if (!r.ok) throw new Error(`npm search failed: ${r.status}`);
    const j = await r.json();
    if (!j.objects || j.objects.length === 0) break;
    for (const o of j.objects) pkgs.push({
      name: o.package.name,
      version: o.package.version,
      date: o.package.date,
      description: o.package.description || '',
    });
    if (j.objects.length < size) break;
    from += size;
  }
  return pkgs;
}

async function fetchDownloads(pkg, period) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(`${POINT_URL}/${period}/${encodeURIComponent(pkg).replace('%40', '@').replace('%2F', '/')}`);
      if (r.status === 429 || r.status === 503 || r.status === 1015) {
        await new Promise((res) => setTimeout(res, 600 * (attempt + 1)));
        continue;
      }
      if (!r.ok) return 0;
      const j = await r.json();
      return j.downloads || 0;
    } catch {
      await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
    }
  }
  return 0;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

// Sparkline from a 30-day downloads array using Unicode blocks.
const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
function sparkline(values) {
  if (!values || values.length === 0) return '';
  const max = Math.max(...values);
  if (max === 0) return BLOCKS[0].repeat(values.length);
  return values.map((v) => BLOCKS[Math.min(7, Math.floor((v / max) * 8))]).join('');
}

async function fetchSparkline(pkg) {
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  try {
    const r = await fetch(`https://api.npmjs.org/downloads/range/${fmt(start)}:${fmt(end)}/${pkg}`);
    if (!r.ok) return { values: [], total: 0 };
    const j = await r.json();
    const values = (j.downloads || []).map((d) => d.downloads);
    return { values, total: values.reduce((a, b) => a + b, 0) };
  } catch {
    return { values: [], total: 0 };
  }
}

function pad(s, n) {
  const str = String(s);
  if (str.length >= n) return str.slice(0, n);
  return str + ' '.repeat(n - str.length);
}

function fmtNumber(n) {
  return n.toLocaleString();
}

async function main() {
  const arg = process.argv[2];
  if (!arg || arg === '--help' || arg === '-h') {
    console.log('');
    console.log(chalk.bold('  pkgfolio') + chalk.gray(' v0.1.0'));
    console.log('');
    console.log('  Usage: ' + chalk.cyan('npx pkgfolio <npm-username>'));
    console.log('');
    console.log('  Shows every package you maintain on npm and their');
    console.log('  lifetime + recent download counts in one table.');
    console.log('');
    process.exit(arg ? 0 : 1);
  }

  const username = arg.replace(/^@/, '');
  console.log('');
  console.log(chalk.bold('  pkgfolio') + chalk.gray('  @' + username));
  console.log('');

  process.stdout.write(chalk.gray('  Looking up packages...'));
  const pkgs = await findPackages(username);
  process.stdout.write('\r' + ' '.repeat(40) + '\r');

  if (pkgs.length === 0) {
    console.log(chalk.yellow(`  No packages found for maintainer "${username}".`));
    console.log(chalk.gray('  Is it the exact npm username (not email, not org)?'));
    console.log('');
    process.exit(1);
  }

  process.stdout.write(chalk.gray(`  Fetching stats for ${pkgs.length} packages...`));

  // 4 packages concurrent, 2 queries per package (lifetime + sparkline).
  // Last month/week/day are computed from the sparkline array. Stays under
  // the npm API rate limit and finishes a 17-package portfolio in ~5s.
  const today = new Date().toISOString().slice(0, 10);
  const sum = (arr) => arr.reduce((s, n) => s + n, 0);
  async function worker(queue, out) {
    while (queue.length > 0) {
      const p = queue.shift();
      const [lifetime, spark] = await Promise.all([
        fetchDownloads(p.name, '2025-01-01:' + today),
        fetchSparkline(p.name),
      ]);
      const values = spark.values;
      out.push({
        name: p.name,
        version: p.version,
        published: formatDate(p.date),
        lifetime,
        lastMonth: sum(values),
        lastWeek: sum(values.slice(-7)),
        lastDay: values[values.length - 1] || 0,
        spark: values,
      });
    }
  }
  const rows = [];
  const queue = [...pkgs];
  await Promise.all([worker(queue, rows), worker(queue, rows), worker(queue, rows), worker(queue, rows)]);
  process.stdout.write('\r' + ' '.repeat(60) + '\r');

  rows.sort((a, b) => b.lifetime - a.lifetime);

  // Totals
  const totals = rows.reduce(
    (t, r) => ({
      lifetime: t.lifetime + r.lifetime,
      month: t.month + r.lastMonth,
      week: t.week + r.lastWeek,
      day: t.day + r.lastDay,
    }),
    { lifetime: 0, month: 0, week: 0, day: 0 }
  );

  const nameW = Math.min(38, Math.max(...rows.map((r) => r.name.length)) + 2);

  // Header
  console.log(
    '  ' +
      pad(chalk.bold('Package'), nameW + 12) +
      pad(chalk.bold('Ever'), 20) +
      pad(chalk.bold('30d'), 20) +
      pad(chalk.bold('7d'), 11) +
      pad(chalk.bold('1d'), 9) +
      chalk.bold('Last 30d')
  );
  console.log('  ' + chalk.gray('─'.repeat(nameW + 12 + 20 + 20 + 11 + 9 + 32)));

  for (const r of rows) {
    const lifeColor = r.lifetime >= 1000 ? chalk.green : r.lifetime >= 100 ? chalk.cyan : chalk.gray;
    console.log(
      '  ' +
        pad(r.name, nameW) +
        pad(chalk.gray(r.version), 12) +
        pad(lifeColor(fmtNumber(r.lifetime)), 20) +
        pad(fmtNumber(r.lastMonth), 20) +
        pad(fmtNumber(r.lastWeek), 11) +
        pad(fmtNumber(r.lastDay), 9) +
        chalk.cyan(sparkline(r.spark))
    );
  }

  console.log('  ' + chalk.gray('─'.repeat(nameW + 12 + 20 + 20 + 11 + 9 + 32)));
  console.log(
    '  ' +
      pad(chalk.bold('TOTAL'), nameW + 12) +
      pad(chalk.green.bold(fmtNumber(totals.lifetime)), 20) +
      pad(chalk.bold(fmtNumber(totals.month)), 20) +
      pad(chalk.bold(fmtNumber(totals.week)), 11) +
      pad(chalk.bold(fmtNumber(totals.day)), 9)
  );
  console.log('');
  console.log(
    chalk.gray(`  ${rows.length} packages · ${chalk.bold(fmtNumber(totals.lifetime))} lifetime downloads`)
  );
  console.log('');
}

main().catch((err) => {
  console.error(chalk.red('\n  ' + err.message + '\n'));
  process.exit(1);
});
