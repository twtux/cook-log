#!/usr/bin/env node
// Cook Journal generator
// Reads cook-log/cooks/*.md (+ matching <date>-photos/ folders) and builds a
// static, browsable journal under cook-log/journal/ (index + per-cook pages).
// No dependencies. Dedupes photos by content hash. Run: node scripts/build-journal.mjs

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COOKS = path.join(ROOT, 'cooks');
const REF = path.join(ROOT, 'reference');
const OUT = path.join(ROOT, 'journal');

const IMG_RE = /\.(jpe?g|png|webp|gif)$/i;

// ---------- tiny markdown -> HTML (headers, bold, italic, tables, lists, hr, p) ----------
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  const flushList = (buf, tag) => { if (buf.length) { out.push(`<${tag}>` + buf.map(x => `<li>${inline(x)}</li>`).join('') + `</${tag}>`); buf.length = 0; } };
  while (i < lines.length) {
    let line = lines[i];
    // table
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|/.test(lines[i + 1])) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const parse = r => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
      const head = parse(rows[0]);
      const body = rows.slice(2).map(parse);
      let t = '<table><thead><tr>' + head.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>';
      for (const r of body) t += '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
      t += '</tbody></table>';
      out.push(t);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*---\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      flushList(buf, 'ul'); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      flushList(buf, 'ol'); continue;
    }
    if (line.trim() === '') { i++; continue; }
    // paragraph (gather until blank)
    const buf = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) { buf.push(lines[i]); i++; }
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out.join('\n');
}

// ---------- gather cooks ----------
function titleFrom(md, fallback) {
  const m = md.match(/^#\s+(.*)$/m);
  return m ? m[1].replace(/[#*`]/g, '').trim() : fallback;
}
function summaryFrom(md) {
  const m = md.match(/\*\*Cook:\*\*\s*(.+)/);
  return m ? m[1].replace(/\*\*/g, '').trim() : '';
}
function dateFrom(name) {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '0000-00-00';
}

const files = fs.readdirSync(COOKS)
  .filter(f => f.endsWith('.md') && !f.startsWith('PLAN-') && f !== 'README.md')
  .sort().reverse();

const cooks = [];
for (const f of files) {
  const md = fs.readFileSync(path.join(COOKS, f), 'utf8');
  const date = dateFrom(f);
  const slug = f.replace(/\.md$/, '');
  const photoDir = path.join(COOKS, `${date}-photos`);
  let photos = [];
  if (fs.existsSync(photoDir)) {
    const seen = new Set();
    for (const p of fs.readdirSync(photoDir).filter(x => IMG_RE.test(x)).sort()) {
      const full = path.join(photoDir, p);
      const hash = crypto.createHash('md5').update(fs.readFileSync(full)).digest('hex');
      if (seen.has(hash)) continue;
      seen.add(hash);
      photos.push({ full, name: p });
    }
  }
  cooks.push({ f, slug, date, md, photos, title: titleFrom(md, slug), summary: summaryFrom(md) });
}

// ---------- render ----------
const CSS = `
:root{--bg:#171310;--card:#221b16;--ink:#f4ece4;--muted:#b9a894;--fire:#e0632a;--ember:#f0a33c;--line:#3a2e25}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
a{color:var(--ember);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:860px;margin:0 auto;padding:24px 18px 72px}
header.top{display:flex;align-items:center;gap:12px;margin:8px 0 26px}
header.top h1{font-size:1.5rem;margin:0}
.crumb{color:var(--muted);font-size:.9rem;margin-bottom:14px}
.card{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-bottom:16px;transition:border-color .15s}
.card:hover{border-color:var(--fire);text-decoration:none}
.card .thumb{height:180px;background:#0d0a08 center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:3rem}
.card .body{padding:14px 16px}
.card h2{margin:0 0 4px;font-size:1.15rem;color:var(--ink)}
.card .meta{color:var(--muted);font-size:.85rem}
.card .sum{color:var(--muted);font-size:.92rem;margin-top:6px}
article h1{font-size:1.6rem;margin:.2em 0 .1em}
article h2{color:var(--ember);border-bottom:1px solid var(--line);padding-bottom:4px;margin-top:1.6em}
article h3{color:var(--fire);font-size:1.05rem}
article table{border-collapse:collapse;width:100%;margin:12px 0}
article th,article td{border:1px solid var(--line);padding:7px 10px;text-align:left;font-size:.92rem}
article th{background:#2b221b}
article code{background:#2b221b;padding:1px 5px;border-radius:4px;font-size:.88em}
article hr{border:0;border-top:1px solid var(--line);margin:1.4em 0}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:16px 0}
.gallery a{display:block;aspect-ratio:1;border-radius:10px;overflow:hidden;background:#0d0a08}
.gallery img{width:100%;height:100%;object-fit:cover;display:block}
.foot{color:var(--muted);font-size:.8rem;margin-top:40px;border-top:1px solid var(--line);padding-top:14px}
.pill{display:inline-block;background:#2b221b;border:1px solid var(--line);color:var(--muted);font-size:.75rem;padding:2px 9px;border-radius:20px;margin-left:6px}
.refrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.refcard{display:flex;flex-direction:column;align-items:center;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 8px;color:var(--ink);font-weight:600;font-size:.95rem}
.refcard:hover{border-color:var(--fire);text-decoration:none}
.refcard span{font-size:1.7rem}
@media(max-width:520px){.refrow{grid-template-columns:1fr}}
`;

function page(title, bodyHtml, depth) {
  const up = '../'.repeat(depth);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${up}assets/journal.css"></head>
<body><div class="wrap">${bodyHtml}
<div class="foot">🔥 Tom's Cook Journal · <a href="${up}index.html">all cooks</a> · <a href="/pit-plan/">Pit Plan</a></div>
</div></body></html>`;
}

// clean output
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'assets', 'journal.css'), CSS);

// per-cook pages
for (const c of cooks) {
  const dir = path.join(OUT, c.slug);
  fs.mkdirSync(dir, { recursive: true });
  let photoHtml = '';
  if (c.photos.length) {
    const pdir = path.join(dir, 'photos');
    fs.mkdirSync(pdir, { recursive: true });
    const items = [];
    c.photos.forEach((p, idx) => {
      const ext = path.extname(p.name).toLowerCase();
      const fn = `${String(idx + 1).padStart(2, '0')}${ext}`;
      fs.copyFileSync(p.full, path.join(pdir, fn));
      items.push(`<a href="photos/${fn}" target="_blank"><img loading="lazy" src="photos/${fn}" alt=""></a>`);
    });
    photoHtml = `<h2>Photos <span class="pill">${c.photos.length}</span></h2><div class="gallery">${items.join('')}</div>`;
  }
  const body = `<div class="crumb"><a href="../index.html">← All cooks</a></div>
<article>${mdToHtml(c.md)}</article>${photoHtml}`;
  fs.writeFileSync(path.join(dir, 'index.html'), page(c.title, body, 1));
}

// reference pages
const REFS = [
  { file: 'prep-checklist.md', slug: 'prep-checklist', title: 'Prep Checklist', icon: '✅' },
  { file: 'flavor-prep.md', slug: 'flavor-prep', title: 'Flavor Prep', icon: '🧄' },
  { file: 'sauces.md', slug: 'sauces', title: 'Sauces', icon: '🍯' },
  { file: 'sides.md', slug: 'sides', title: 'Sides', icon: '🌽' },
];
const refsBuilt = [];
for (const r of REFS) {
  const p = path.join(REF, r.file);
  if (!fs.existsSync(p)) continue;
  const md = fs.readFileSync(p, 'utf8');
  const dir = path.join(OUT, 'reference', r.slug);
  fs.mkdirSync(dir, { recursive: true });
  const body = `<div class="crumb"><a href="../../index.html">← All cooks</a></div><article>${mdToHtml(md)}</article>`;
  fs.writeFileSync(path.join(dir, 'index.html'), page(r.title, body, 2));
  refsBuilt.push(r);
}
const refStrip = refsBuilt.length
  ? `<div class="crumb" style="margin:22px 0 8px">📚 Reference</div><div class="refrow">${refsBuilt.map(r => `<a class="refcard" href="reference/${r.slug}/index.html"><span>${r.icon}</span>${r.title}</a>`).join('')}</div>`
  : '';

// index
const cards = cooks.map(c => {
  const thumb = c.photos.length
    ? `<div class="thumb" style="background-image:url('${c.slug}/photos/01${path.extname(c.photos[0].name).toLowerCase()}')"></div>`
    : `<div class="thumb">🔥</div>`;
  const pretty = new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  return `<a class="card" href="${c.slug}/index.html">${thumb}
<div class="body"><h2>${esc(c.title)}</h2>
<div class="meta">${pretty}${c.photos.length ? ` · 📷 ${c.photos.length}` : ''}</div>
${c.summary ? `<div class="sum">${esc(c.summary)}</div>` : ''}</div></a>`;
}).join('\n');

const index = `<header class="top"><h1>🔥 Tom's Cook Journal</h1></header>
<p style="color:var(--muted);margin-top:-14px">Every cook, logged pitmaster-style: prep, seasoning, fire, temps, and what I'd change next time. <a href="/pit-plan/">Pit Plan →</a></p>
${refStrip}
<div class="crumb" style="margin:24px 0 8px">🔥 Cooks</div>
${cards}`;
fs.writeFileSync(path.join(OUT, 'index.html'), page("Tom's Cook Journal", index, 0));

console.log(`Built ${cooks.length} cooks → ${OUT}`);
cooks.forEach(c => console.log(`  ${c.date}  ${c.photos.length ? '📷' + String(c.photos.length).padStart(2) : '   '}  ${c.title}`));
