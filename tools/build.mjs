// Builds entry.png: the world news of Tuesday 17 November 2026 on one 1024 x 1024 page.
// Usage: node tools/build.mjs <land.geojson> [browser.exe]
//   <land.geojson>  Natural Earth 1:110m land polygons (public domain), used only to draw the map.
//   [browser.exe]   a Chromium browser (Edge or Chrome) that renders the page to PNG in headless mode.
// Writes build/page.html and entry.png (repository root). Node 22 standard library only.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [landPath, browserArg] = process.argv.slice(2);
if (!landPath) throw new Error('usage: node tools/build.mjs <land.geojson> [browser.exe]');

// ---------------------------------------------------------------------------------------------------------------
// The stories. Each one happened or was first reported on 17 November 2026; one short headline each.
// cat: conflict | politics | economy | health | tech | climate | sport | press
// at: [lon, lat] of the place; off: [dx, dy] pixels from the place to its numbered marker (0,0 = on the spot).
const LEAD = {
  title: 'Trump meets Quad leaders in Manila',
  context: 'US, Japan, India, Australia announce critical-minerals deals before Thursday\u2019s Xi\u2013Putin summit',
  cat: 'politics', at: [121.0, 14.6], off: [0, 0],
};
const STORIES = [
  { t: 'Ukraine hits Crimea bridge again', cat: 'conflict', at: [36.5, 45.3], off: [9, -32] },
  { t: 'Iran drone attack on Bahrain base', cat: 'conflict', at: [50.6, 26.1], off: [-4, -21] },
  { t: '3 more ships on fire in Hormuz', cat: 'economy', at: [56.5, 26.4], off: [18, 13] },
  { t: 'Mongolia\u2019s president to resign', cat: 'politics', at: [106.9, 47.9], off: [0, 0] },
  { t: 'Ebola cases top 11,000 in DR Congo', cat: 'health', at: [29.5, 2.0], off: [-34, -6] },
  { t: 'Wall Street slides; Dow \u2212849', cat: 'economy', at: [-74.0, 40.7], off: [0, 0] },
  { t: 'Huang open to Nvidia CEO return', cat: 'tech', at: [-122.0, 37.4], off: [0, 0] },
  { t: 'Eisenkot ally elected Knesset speaker', cat: 'politics', at: [35.2, 31.8], off: [10, 25] },
  { t: 'Russian jets breach Japan airspace', cat: 'conflict', at: [130.4, 34.2], off: [0, 0] },
  { t: 'Houthis: Saudi strike kills 7', cat: 'conflict', at: [42.95, 14.8], off: [12, 23] },
  { t: 'Tha\u00e7i gets 17 more months in jail', cat: 'politics', at: [4.3, 52.1], off: [0, -38] },
  { t: 'Serbia\u2019s student-led parliament meets', cat: 'politics', at: [20.5, 44.8], off: [-6, -36] },
  { t: 'Five EU states plan Rwanda return hub', cat: 'politics', at: [30.1, -1.95], off: [22, 8] },
  { t: 'China, Canada widen tariff relief', cat: 'economy', at: [116.4, 39.9], off: [0, 0] },
  { t: 'Turkey seizes opposition S\u00f6zc\u00fc TV', cat: 'press', at: [29.0, 41.0], off: [-25, 13] },
  { t: 'UK sanctions 8 settlement builders', cat: 'politics', at: [-0.1, 51.5], off: [-40, 5] },
  { t: 'Mondlane trial opens in Maputo', cat: 'politics', at: [32.6, -26.0], off: [0, 0] },
  { t: 'Guinea jails 224 in gold-mining case', cat: 'politics', at: [-9.2, 11.4], off: [0, 0] },
  { t: 'Autonomous-weapons talks stall at UN', cat: 'tech', at: [6.1, 46.2], off: [-43, 27.5] },
  { t: 'COP31 talks head into final days', cat: 'climate', at: [30.7, 36.9], off: [-19, 39.5] },
  { t: 'Cook Islands on cyclone alert', cat: 'climate', at: [-165.8, -10.9], off: [0, 0] },
  { t: 'India beat Pakistan for SAFF title', cat: 'sport', at: [90.4, 23.8], off: [0, 0] },
  { t: 'Zverev beats Shelton at ATP Finals', cat: 'sport', at: [7.7, 45.1], off: [-9.6, 47.4] },
  { t: 'Haitians rally for Salvadoran troops', cat: 'politics', at: [-72.3, 18.5], off: [0, 0] },
  { t: 'Ecuador fishermen sue US over strike', cat: 'politics', at: [-80.7, -1.0], off: [0, 0] },
  { t: 'Life sentence over Dublin attack', cat: 'politics', at: [-6.3, 53.3], off: [-30, -24] },
  { t: 'Air Niugini resumes NZ flights', cat: 'economy', at: [147.2, -9.4], off: [0, 0] },
];

const COLORS = {
  conflict: '#c0262d', politics: '#1d4f9a', economy: '#23803a', health: '#c2185b',
  tech: '#6a2c9c', climate: '#00838a', sport: '#d9620a', press: '#6b4a2b',
};

// Simple 24 x 24 pictograms, one per kind of story, drawn in white on the category colour.
const ICONS = {
  conflict: '<path d="M12 2l2.2 5.6 5.8-1.9-3 5.3 5 3.2-5.9.9.6 6-4.7-3.8L7.3 21l.6-6L2 14.2l5-3.2-3-5.3 5.8 1.9z"/>',
  politics: '<path d="M12 2L2 7.5h20zM4 9h3v9H4zm6.5 0h3v9h-3zM17 9h3v9h-3zM2 19.5h20V22H2z"/>',
  economy: '<path d="M3 21V13h4v8zm7 0V9h4v12zm7 0V4h4v17z"/>',
  health: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  tech: '<path d="M7 7h10v10H7zM9 2h2v4H9zm4 0h2v4h-2zM9 18h2v4H9zm4 0h2v4h-2zM2 9h4v2H2zm0 4h4v2H2zm16-4h4v2h-4zm0 4h4v2h-4z"/><path fill="COLOR" d="M10 10h4v4h-4z"/>',
  climate: '<path d="M7 17a5 5 0 0 1-.6-9.96A6.5 6.5 0 0 1 19 9a4 4 0 0 1-.5 8zM8 19l-1.5 3M12.5 19L11 22M17 19l-1.5 3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  sport: '<path d="M6 3h12v4a6 6 0 0 1-12 0zM3 4h3v2.5H4.5A1.5 1.5 0 0 0 6 9v1.5A4 4 0 0 1 3 6.5zm18 0h-3v2.5h1.5A1.5 1.5 0 0 1 18 9v1.5a4 4 0 0 0 3-4zM10.5 13h3v4h-3zM7 18h10v3H7z"/>',
  press: '<path d="M3 6h18v12H3z"/><path fill="COLOR" d="M5 8h14v8H5z"/><path d="M9 20h6v2H9zM8 2l4 3 4-3" stroke="#fff" stroke-width="1.6" fill="none"/>',
};
const icon = (cat, size) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="#fff">${ICONS[cat].replaceAll('COLOR', COLORS[cat])}</svg>`;

// ---------------------------------------------------------------------------------------------------------------
// The map: equirectangular, cropped to the inhabited latitudes.
const MAP = { x: 10, y: 0, w: 1004, lon0: -172, lon1: 182, lat0: 76, lat1: -47 };
MAP.k = MAP.w / (MAP.lon1 - MAP.lon0);
MAP.h = Math.round((MAP.lat0 - MAP.lat1) * MAP.k);
const px = ([lon, lat]) => [(lon - MAP.lon0) * MAP.k, (MAP.lat0 - lat) * MAP.k];

function landPathD() {
  const geo = JSON.parse(readFileSync(landPath, 'utf8'));
  let d = '';
  const ring = (pts) => {
    let prev = '';
    pts.forEach((p, i) => {
      const [x, y] = px(p).map((v) => v.toFixed(1));
      const cur = `${x},${y}`;
      if (cur === prev) return;
      d += (i === 0 ? 'M' : 'L') + cur;
      prev = cur;
    });
    d += 'Z';
  };
  for (const f of geo.features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) for (const r of poly) ring(r);
  }
  return d;
}

function mapSvg() {
  const all = [LEAD, ...STORIES];
  let marks = '';
  all.forEach((s, i) => {
    const [x, y] = px(s.at);
    const [bx, by] = [x + s.off[0], y + s.off[1]];
    const c = COLORS[s.cat];
    const r = i === 0 ? 17 : 13;
    if (s.off[0] || s.off[1]) {
      marks += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#2b2b2b" stroke-width="1.6"/>`;
      marks += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#2b2b2b"/>`;
    }
    marks += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${r}" fill="${c}" stroke="#fff" stroke-width="2"/>`;
    marks += `<text x="${bx.toFixed(1)}" y="${(by + (i === 0 ? 7 : 5.6)).toFixed(1)}" class="mn${i === 0 ? ' lead' : ''}">${i + 1}</text>`;
  });
  return `<svg width="${MAP.w}" height="${MAP.h}" viewBox="0 0 ${MAP.w} ${MAP.h}">
<rect width="${MAP.w}" height="${MAP.h}" rx="10" fill="#d9e6f0"/>
<path d="${landPathD()}" fill="#efe9db" stroke="#b9ae95" stroke-width="0.8" fill-rule="nonzero"/>
${marks}</svg>`;
}

// ---------------------------------------------------------------------------------------------------------------
function page() {
  const half = Math.ceil(STORIES.length / 2);
  const item = (s, i) => `<li><span class="num" style="background:${COLORS[s.cat]}">${i + 2}</span>` +
    `<span class="cat" style="background:${COLORS[s.cat]}">${icon(s.cat, 20)}</span><span class="t">${s.t}</span></li>`;
  const col = (a, from) => `<ol>${a.map((s, j) => item(s, from + j)).join('')}</ol>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1024px;height:1024px;overflow:hidden;background:#fbf8f1;color:#151515;
  font-family:"Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased}
header{height:84px;display:flex;align-items:center;justify-content:center;border-bottom:4px solid #c0262d;margin:0 10px}
h1{font-size:58px;font-weight:800;letter-spacing:-0.5px;line-height:1}
.lead{margin:10px 10px 0;display:flex;align-items:center;gap:14px;height:82px}
.lead .num{width:56px;height:56px;border-radius:50%;font-size:34px;flex:none}
.lead h2{font-size:35px;font-weight:800;line-height:1.08;white-space:nowrap}
.lead p{font-size:21px;font-weight:600;color:#333;white-space:nowrap;margin-top:3px}
.map{margin:6px 10px 0;height:${MAP.h}px;position:relative}
.key{position:absolute;left:44px;top:236px;width:226px;display:grid;grid-template-columns:1fr 1fr;gap:3px 6px;
  font-size:17px;font-weight:700;color:#222;line-height:1}
.key>span{display:flex;align-items:center;gap:6px;height:24px}
.key .cat{width:22px;height:22px;border-radius:5px}
.mn{font:700 15px "Segoe UI",Arial,sans-serif;fill:#fff;text-anchor:middle}
.mn.lead{font-size:20px}
.list{display:flex;gap:16px;margin:10px 10px 0}
ol{list-style:none;flex:1;min-width:0}
li{display:flex;align-items:center;height:33px;gap:7px}
.num{display:flex;align-items:center;justify-content:center;flex:none;width:30px;height:28px;border-radius:14px;
  color:#fff;font-weight:800;font-size:18px}
.cat{display:flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border-radius:6px}
.t{font-size:23px;font-weight:600;white-space:nowrap;overflow:hidden;flex:1;min-width:0}
</style></head><body>
<header><h1>Tuesday 17 November 2026</h1></header>
<div class="lead"><span class="num" style="background:${COLORS[LEAD.cat]};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">1</span>
<div><h2>${LEAD.title}</h2><p>${LEAD.context}</p></div></div>
<div class="map">${mapSvg()}<div class="key">${Object.keys(COLORS).map((c) =>
    `<span><span class="cat" style="background:${COLORS[c]}">${icon(c, 18)}</span>${c[0].toUpperCase() + c.slice(1)}</span>`).join('')}</div></div>
<div class="list">${col(STORIES.slice(0, half), 0)}${col(STORIES.slice(half), half)}</div>
<script>
// Shrink any headline that would overflow its column, never below 20px, so no text is cut off.
for (const el of document.querySelectorAll('.t, .lead h2, .lead p')) {
  let f = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth + 0.5 && f > 20) { f -= 0.5; el.style.fontSize = f + 'px'; }
  if (el.scrollWidth > el.clientWidth + 0.5) console.error('OVERFLOW ' + el.textContent);
}
</script></body></html>`;
}

// ---------------------------------------------------------------------------------------------------------------
const buildDir = join(root, 'build');
mkdirSync(buildDir, { recursive: true });
const htmlPath = join(buildDir, 'page.html');
writeFileSync(htmlPath, page());

const browsers = [browserArg,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/chromium', '/usr/bin/google-chrome'].filter(Boolean);
const browser = browsers.find((b) => existsSync(b));
if (!browser) throw new Error('no Chromium browser found; pass its path as the second argument');

const outPng = join(root, 'entry.png');
execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--window-size=1024,1024', '--virtual-time-budget=3000', `--user-data-dir=${join(buildDir, 'profile')}`,
  `--screenshot=${outPng}`, 'file:///' + htmlPath.replaceAll('\\', '/')], { stdio: 'inherit' });
console.log(`wrote ${outPng} (${statSync(outPng).size} bytes), map ${MAP.w}x${MAP.h}`);
