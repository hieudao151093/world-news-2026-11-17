// Builds entry.png: the world news of Tuesday 17 November 2026 on one 1024 x 1024 page.
// Usage: node tools/build.mjs <ne_110m_land.geojson> <ne_50m_land.geojson> [browser.exe]
//   Natural Earth land polygons (public domain): 1:110m draws the world map, 1:50m the small locator maps.
//   [browser.exe]  a Chromium browser (Edge or Chrome) that renders the page to PNG in headless mode.
// Writes build/page.html and entry.png (repository root). Node 22 standard library only.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [land110Path, land50Path, browserArg] = process.argv.slice(2);
if (!land110Path || !land50Path) throw new Error('usage: node tools/build.mjs <land110.geojson> <land50.geojson> [browser]');
const LAND110 = JSON.parse(readFileSync(land110Path, 'utf8'));
const LAND50 = JSON.parse(readFileSync(land50Path, 'utf8'));

const COLORS = {
  conflict: '#c0262d', politics: '#1d4f9a', economy: '#23803a', health: '#c2185b',
  tech: '#6a2c9c', climate: '#00838a', sport: '#d9620a', press: '#6b4a2b',
};

// ---------------------------------------------------------------------------------------------------------------
// The stories. Each happened or was first reported on 17 November 2026, worded as reported.
// at: [lon, lat]; off: [dx, dy] pixels from the place to its numbered marker on the world map.
const LEAD = {
  lines: ['Trump meets Quad', 'leaders in Manila'],
  context: ['US, Japan, India and Australia', 'announce critical-minerals deals'],
  cat: 'politics', at: [121.0, 14.6], off: [0, 0],
};
// Six illustrated panels, numbered 2 to 7.
const PANELS = [
  { lines: ['Ukraine hits Crimea', 'bridge again'], cap: '2 killed in Crimea', cat: 'conflict', at: [36.5, 45.3], off: [17, -28], viz: 'crimea' },
  { lines: ['Iran drones target', 'US radar in Bahrain'], cap: 'Bahrain: intercepted', cat: 'conflict', at: [50.6, 26.1], off: [-8, -24], viz: 'bahrain' },
  { lines: ['Three more ships', 'ablaze near Hormuz'], cap: 'An LNG carrier among them', cat: 'economy', at: [56.5, 26.4], off: [19, 15], viz: 'hormuz' },
  { lines: ['Russian jets breach', 'Japan\u2019s airspace'], cap: 'Japan scrambles fighters', cat: 'conflict', at: [130.4, 34.2], off: [0, 0], viz: 'japan' },
  { lines: ['Wall St slides ahead', 'of Nvidia results'], cap: 'S&P 500 lowest since July', cat: 'economy', at: [-74.0, 40.7], off: [0, 0], viz: 'dow' },
  { lines: ['Ebola in DR Congo', 'grows at record pace'], cap: '5,505 deaths in six months', cat: 'health', at: [29.5, 2.0], off: [-28, -6], viz: 'ebola' },
];
// One-line briefs, numbered 8 onwards.
const BRIEFS = [
  { t: 'Mongolia\u2019s president to resign', cat: 'politics', at: [106.9, 47.9], off: [0, 0] },
  { t: 'Eisenkot ally elected Knesset speaker', cat: 'politics', at: [35.2, 31.8], off: [-7, 38] },
  { t: 'Houthis: Saudi strike kills 7', cat: 'conflict', at: [42.95, 14.8], off: [13, 22] },
  { t: 'Serbia\u2019s student-led parliament meets', cat: 'politics', at: [20.5, 44.8], off: [-10, -29] },
  { t: 'Five EU states plan Rwanda return hub', cat: 'politics', at: [30.1, -1.95], off: [24, 10] },
  { t: 'China, Canada widen tariff relief', cat: 'economy', at: [116.4, 39.9], off: [0, 0] },
  { t: 'Turkey seizes opposition S\u00f6zc\u00fc TV', cat: 'press', at: [29.0, 41.0], off: [-31, 18] },
  { t: 'UK sanctions 8 settlement builders', cat: 'politics', at: [-0.1, 51.5], off: [-34, -4] },
  { t: 'Mondlane trial opens in Maputo', cat: 'politics', at: [32.6, -26.0], off: [0, -13] },
  { t: 'Guinea jails 224 in gold-mining case', cat: 'politics', at: [-9.2, 11.4], off: [0, 0] },
  { t: 'Autonomous-weapons talks stall at UN', cat: 'tech', at: [6.1, 46.2], off: [-42, 23] },
  { t: 'COP31 talks head into final days', cat: 'climate', at: [30.7, 36.9], off: [-26, 38] },
  { t: 'Cook Islands on cyclone alert', cat: 'climate', at: [-165.8, -10.9], off: [0, 0] },
  { t: 'India beat Pakistan for SAFF title', cat: 'sport', at: [90.4, 23.8], off: [0, 0] },
  { t: 'Zverev beats Shelton at ATP Finals', cat: 'sport', at: [7.7, 45.1], off: [-12, 40] },
  { t: 'Haitians rally for Salvadoran troops', cat: 'politics', at: [-72.3, 18.5], off: [0, 0] },
  { t: 'Ecuador fishermen sue US over strike', cat: 'politics', at: [-80.7, -1.0], off: [0, 0] },
  { t: 'Air Niugini resumes NZ flights', cat: 'economy', at: [147.2, -9.4], off: [0, 0] },
];
const ALL = [LEAD, ...PANELS, ...BRIEFS];

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
const f1 = (v) => v.toFixed(1);

// ---------------------------------------------------------------------------------------------------------------
// Land polygons as one SVG path, through any projection; rings wholly outside the view are skipped.
function landD(geo, proj, w, h) {
  let d = '';
  for (const f of geo.features) {
    const g = f.geometry;
    for (const poly of g.type === 'Polygon' ? [g.coordinates] : g.coordinates) {
      for (const ring of poly) {
        const pts = ring.map(proj);
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        if (Math.max(...xs) < -5 || Math.min(...xs) > w + 5 || Math.max(...ys) < -5 || Math.min(...ys) > h + 5) continue;
        let prev = '';
        pts.forEach(([x, y], i) => {
          const cur = `${f1(x)},${f1(y)}`;
          if (cur === prev) return;
          d += (i === 0 ? 'M' : 'L') + cur;
          prev = cur;
        });
        d += 'Z';
      }
    }
  }
  return d;
}

// A small locator map: the box [lon0, lon1, lat0 (north), lat1 (south)] fills w x h, centred.
function inset([lon0, lon1, lat0, lat1], w, h) {
  const lonc = (lon0 + lon1) / 2, latc = (lat0 + lat1) / 2, c = Math.cos((latc * Math.PI) / 180);
  const s = Math.max(w / ((lon1 - lon0) * c), h / (lat0 - lat1));
  const p = ([lon, lat]) => [w / 2 + (lon - lonc) * c * s, h / 2 - (lat - latc) * s];
  const base = `<rect width="${w}" height="${h}" fill="#d4e3ef"/>` +
    `<path d="${landD(LAND50, p, w, h)}" fill="#ece5d3" stroke="#a99d82" stroke-width="0.7"/>`;
  return { p, base };
}
const at = (p, ll) => p(ll).map(f1);
const burst = (x, y, r, color) => {
  let pts = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8, rr = i % 2 ? r * 0.45 : r;
    pts += `${f1(+x + rr * Math.cos(a))},${f1(+y + rr * Math.sin(a))} `;
  }
  return `<polygon points="${pts}" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
};
const label = (x, y, t, size = 13, anchor = 'middle', color = '#6b6250') =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${color}" text-anchor="${anchor}" letter-spacing="0.5">${t}</text>`;
const arrowHead = (id, color) =>
  `<defs><marker id="${id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker></defs>`;

const VIZ_W = 197, VIZ_H = 92;
const VIZ = {
  crimea() {
    const { p, base } = inset([32.4, 40.0, 47.0, 44.3], VIZ_W, VIZ_H);
    const [ax, ay] = at(p, [36.50, 45.31]), [bx, by] = at(p, [36.70, 45.23]);
    const [mx, my] = at(p, [36.60, 45.27]);
    return base + label(...at(p, [34.1, 45.35]), 'CRIMEA') + label(...at(p, [38.9, 46.2]), 'RUSSIA') +
      `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#222" stroke-width="4"/>` + burst(mx, my, 14, COLORS.conflict) +
      label(f1(+mx + 4), f1(+my + 30), 'Kerch bridge', 13, 'middle', '#222');
  },
  bahrain() {
    const { p, base } = inset([47.0, 57.5, 30.6, 24.2], VIZ_W, VIZ_H);
    const [bx, by] = at(p, [50.55, 26.07]), [sx, sy] = at(p, [52.6, 28.6]);
    return base + arrowHead('ab', COLORS.conflict) + label(...at(p, [55.2, 28.7]), 'IRAN') +
      `<path d="M${sx} ${sy}Q${f1((+sx + +bx) / 2 + 6)} ${f1(+by - 24)} ${f1(+bx + 8)} ${f1(+by - 7)}" stroke="${COLORS.conflict}" stroke-width="3" fill="none" stroke-dasharray="6 4" marker-end="url(#ab)"/>` +
      `<circle cx="${bx}" cy="${by}" r="7" fill="#1d4f9a" stroke="#fff" stroke-width="2"/>` +
      label(f1(+bx - 12), f1(+by - 2), 'US base,', 13, 'end', '#222') + label(f1(+bx - 12), f1(+by + 13), 'Bahrain', 13, 'end', '#222');
  },
  hormuz() {
    const { p, base } = inset([54.6, 58.8, 27.4, 24.9], VIZ_W, VIZ_H);
    const ship = ([x, y]) => `<g transform="translate(${x} ${y})"><path d="M-13 0h26l-5 7h-16z" fill="#2b2b2b"/><path d="M-6 -6h10v6h-10z" fill="#2b2b2b"/>` +
      `<path d="M-1 -7c-6-6 2-9 0-15c7 5 8 10 3 15z" fill="#e8590c"/><path d="M0 -8c-2-3 1-5 0-8c3 3 3 6 1 8z" fill="#ffd43b"/></g>`;
    return base + label(...at(p, [55.6, 27.05]), 'IRAN') + label(...at(p, [55.0, 25.25]), 'UAE') +
      [[56.6, 26.55], [56.95, 26.0], [57.35, 25.45]].map((ll) => ship(at(p, ll))).join('') +
      label(...at(p, [58.05, 26.45]), 'Strait of', 12, 'middle', '#222') + label(...at(p, [58.05, 26.2]), 'Hormuz', 12, 'middle', '#222');
  },
  japan() {
    const { p, base } = inset([126.0, 135.0, 37.0, 31.8], VIZ_W, VIZ_H);
    const pts = [[132.6, 36.4], [130.6, 34.6], [130.1, 34.24], [129.3, 33.6], [127.8, 33.0]].map((ll) => at(p, ll));
    const [ox, oy] = at(p, [130.1, 34.24]);
    const [jx, jy] = pts[0];
    return base + arrowHead('aj', COLORS.conflict) + label(...at(p, [133.4, 34.55]), 'JAPAN') + label(36, 17, 'S. KOREA', 13, 'start') +
      `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" stroke="${COLORS.conflict}" stroke-width="3" fill="none" stroke-dasharray="6 4" marker-end="url(#aj)"/>` +
      `<g transform="translate(${jx} ${jy}) rotate(225)"><path d="M0 -11L2.5 -3L11 2L11 4.5L2.5 2.5L2 9L5 11L5 12.5L0 11.5L-5 12.5L-5 11L-2 9L-2.5 2.5L-11 4.5L-11 2L-2.5 -3z" fill="#222"/></g>` +
      burst(ox, oy, 9, COLORS.conflict) + label(f1(+ox + 26), f1(+oy + 22), 'Okinoshima', 12, 'middle', '#222');
  },
  dow() {
    return `<rect width="${VIZ_W}" height="${VIZ_H}" fill="#f6e3e3"/>` +
      `<path d="M164 8v44h-13l22 30 22-30h-13V8z" fill="${COLORS.conflict}"/>` +
      `<text x="36" y="44" font-size="40" font-weight="800" fill="${COLORS.conflict}">\u2212849</text>` +
      `<text x="11" y="64" font-size="15" font-weight="700" fill="#222">Dow points, \u22121.6%</text>` +
      `<text x="11" y="83" font-size="15" font-weight="700" fill="#222">S&amp;P 500 \u22121.0%</text>`;
  },
  ebola() {
    // Confirmed cases in the first six months: this outbreak against West Africa's 2014 one (Reuters' comparison).
    const bar = (cx, n, color, name) => {
      const h = Math.round((n / 11254) * 50), top = 74 - h;
      return `<rect x="${cx - 28}" y="${top}" width="56" height="${h}" rx="3" fill="${color}"/>` +
        `<text x="${cx}" y="${top - 5}" font-size="18" font-weight="800" fill="${color}" text-anchor="middle">${n.toLocaleString('en-US')}</text>` +
        `<text x="${cx}" y="89" font-size="12.5" font-weight="700" fill="#222" text-anchor="middle">${name}</text>`;
    };
    return `<rect width="${VIZ_W}" height="${VIZ_H}" fill="#f8e6ee"/>` +
      bar(62, 11254, COLORS.health, 'DRC 2026') + bar(152, 5325, '#857a80', 'W. Africa 2014');
  },
};

function leadViz(w, h) {
  const { p, base } = inset([104.0, 136.0, 27.0, 5.0], w, h);
  const [mx, my] = at(p, [121.0, 14.6]), [zx, zy] = at(p, [114.06, 22.54]);
  const chips = ['US', 'JP', 'IN', 'AU'].map((t, i) =>
    `<circle cx="${196 + i * 34}" cy="176" r="15" fill="#1d4f9a" stroke="#fff" stroke-width="2"/>` +
    `<text x="${196 + i * 34}" y="182" font-size="15" font-weight="800" fill="#fff" text-anchor="middle">${t}</text>`).join('');
  return base + arrowHead('al', '#222') +
    `<path d="M${mx} ${my}Q${f1(+mx - 6)} ${f1(+zy + 6)} ${f1(+zx + 10)} ${f1(+zy + 4)}" stroke="#222" stroke-width="2.5" fill="none" stroke-dasharray="6 4" marker-end="url(#al)"/>` +
    `<circle cx="${zx}" cy="${zy}" r="6" fill="#222" stroke="#fff" stroke-width="2"/>` +
    `<rect x="4" y="10" width="166" height="44" rx="6" fill="#ffffffd9"/>` +
    label(10, 29, 'Thursday, Shenzhen:', 16, 'start', '#222') + label(10, 48, 'Trump\u2013Xi\u2013Putin talks', 16, 'start', '#222') +
    `<path d="M${mx} ${my}L178 176" stroke="#1d4f9a" stroke-width="2"/>` + chips +
    `<circle cx="${mx}" cy="${my}" r="9" fill="#c0262d" stroke="#fff" stroke-width="2.5"/>` +
    label(f1(+mx - 14), f1(+my + 6), 'Manila', 16, 'end', '#222') + label(247, 207, 'THE QUAD', 15, 'middle', '#1d4f9a');
}

// ---------------------------------------------------------------------------------------------------------------
// The world map: equirectangular, cropped to latitudes 60N to 28S.
const MAP = { w: 1004, lon0: -178, lon1: 176, lat0: 60, lat1: -28 };
MAP.k = MAP.w / (MAP.lon1 - MAP.lon0);
MAP.h = Math.round((MAP.lat0 - MAP.lat1) * MAP.k);
const mp = ([lon, lat]) => [(lon - MAP.lon0) * MAP.k, (MAP.lat0 - lat) * MAP.k];

function worldMap() {
  let marks = '';
  ALL.forEach((s, i) => {
    const [x, y] = mp(s.at);
    const [bx, by] = [x + s.off[0], y + s.off[1]];
    const r = i === 0 ? 15 : 12;
    if (s.off[0] || s.off[1]) {
      marks += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(bx)}" y2="${f1(by)}" stroke="#2b2b2b" stroke-width="1.5"/>` +
        `<circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="#2b2b2b"/>`;
    }
    marks += `<circle cx="${f1(bx)}" cy="${f1(by)}" r="${r}" fill="${COLORS[s.cat]}" stroke="#fff" stroke-width="2"/>` +
      `<text x="${f1(bx)}" y="${f1(by + (i === 0 ? 6.5 : 5))}" class="mn${i === 0 ? ' big' : ''}">${i + 1}</text>`;
  });
  return `<svg width="${MAP.w}" height="${MAP.h}" viewBox="0 0 ${MAP.w} ${MAP.h}">
<rect width="${MAP.w}" height="${MAP.h}" rx="8" fill="#d9e6f0"/>
<path d="${landD(LAND110, mp, MAP.w, MAP.h)}" fill="#efe9db" stroke="#b9ae95" stroke-width="0.8"/>${marks}</svg>`;
}

// ---------------------------------------------------------------------------------------------------------------
function page() {
  const TOP = 76, PH = 184, PW = 213, GAP = 8, LW = 340;
  const panel = (s, i) => {
    const x = 10 + LW + GAP + (i % 3) * (PW + GAP), y = TOP + Math.floor(i / 3) * (PH + GAP);
    return `<div class="panel" style="left:${x}px;top:${y}px;width:${PW}px;height:${PH}px">` +
      `<div class="hl group"><div class="fit">${s.lines[0]}</div><div class="fit">${s.lines[1]}</div></div>` +
      `<div class="vw"><svg class="viz" width="${VIZ_W}" height="${VIZ_H}" viewBox="0 0 ${VIZ_W} ${VIZ_H}">${VIZ[s.viz]()}</svg>` +
      `<span class="num" style="background:${COLORS[s.cat]}">${i + 2}</span></div>` +
      `<div class="cap fit">${s.cap}</div></div>`;
  };
  const brief = (s, i) => `<li><span class="num" style="background:${COLORS[s.cat]}">${i + 8}</span>` +
    `<span class="cat" style="background:${COLORS[s.cat]}">${icon(s.cat, 20)}</span><span class="t fit">${s.t}</span></li>`;
  const half = Math.ceil(BRIEFS.length / 2);
  const mapTop = TOP + 2 * PH + GAP + 8;
  const key = Object.keys(COLORS).map((c) =>
    `<span><span class="cat" style="background:${COLORS[c]}">${icon(c, 16)}</span>${c[0].toUpperCase() + c.slice(1)}</span>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1024px;height:1024px;overflow:hidden;background:#fbf8f1;color:#151515;position:relative;
  font-family:"Segoe UI",Arial,sans-serif}
svg text{font-family:"Segoe UI",Arial,sans-serif}
header{position:absolute;left:10px;right:10px;top:0;height:68px;display:flex;align-items:center;justify-content:center;
  border-bottom:4px solid #c0262d}
h1{font-size:54px;font-weight:800;letter-spacing:-0.5px;line-height:1}
.num{display:flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border-radius:14px;
  color:#fff;font-weight:800;font-size:17px}
.lead{position:absolute;left:10px;top:${TOP}px;width:${LW}px;height:${2 * PH + GAP}px;background:#fff;border:2px solid #1d4f9a;
  border-radius:10px;padding:8px 9px}
.lead .ph{display:flex;gap:9px;align-items:center}
.lead .num{width:46px;height:46px;border-radius:23px;font-size:28px}
.lead .hl{font-size:29px;font-weight:800;line-height:1.08;flex:1;min-width:0}
.lead .viz{display:block;margin-top:8px;border-radius:6px}
.lead .ctx{margin-top:7px;font-size:20px;font-weight:700;line-height:1.2;color:#222}
.panel{position:absolute;background:#fff;border:1px solid #d6cfc0;border-radius:8px;padding:6px 7px}
.panel .hl{font-size:21.5px;font-weight:800;line-height:1.1;height:48px}
.panel .vw{position:relative;margin-top:3px}
.panel .vw .num{position:absolute;left:-2px;top:-2px;width:30px;height:30px;border-radius:15px;font-size:18px;
  border:2px solid #fff}
.panel .viz{display:block;border-radius:5px}
.cap{font-size:16.5px;font-weight:700;color:#333;margin-top:3px;white-space:nowrap}
.fit{white-space:nowrap;overflow:hidden}
.map{position:absolute;left:10px;top:${mapTop}px;width:${MAP.w}px;height:${MAP.h}px}
.mn{font:700 14px "Segoe UI",Arial,sans-serif;fill:#fff;text-anchor:middle}
.mn.big{font-size:19px}
.key{position:absolute;left:58px;top:150px;width:206px;display:grid;grid-template-columns:1fr 1fr;gap:3px 6px;
  font-size:15px;font-weight:700;color:#222;line-height:1}
.key>span{display:flex;align-items:center;gap:5px;height:21px}
.key .cat{width:20px;height:20px;border-radius:4px}
.list{position:absolute;left:10px;right:10px;top:${mapTop + MAP.h + 6}px;display:flex;gap:16px}
ol{list-style:none;flex:1;min-width:0}
li{display:flex;align-items:center;height:32px;gap:7px}
.cat{display:flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;border-radius:6px}
.t{font-size:22.5px;font-weight:600;flex:1;min-width:0}
</style></head><body>
<header><h1>Tuesday 17 November 2026</h1></header>
<div class="lead"><div class="ph"><span class="num" style="background:${COLORS[LEAD.cat]}">1</span>
<div class="hl"><div class="fit">${LEAD.lines[0]}</div><div class="fit">${LEAD.lines[1]}</div></div></div>
<svg class="viz" width="320" height="214" viewBox="0 0 320 214">${leadViz(320, 214)}</svg>
<div class="ctx"><div class="fit">${LEAD.context[0]}</div><div class="fit">${LEAD.context[1]}</div></div></div>
${PANELS.map(panel).join('')}
<div class="map">${worldMap()}<div class="key">${key}</div></div>
<div class="list"><ol>${BRIEFS.slice(0, half).map((s, j) => brief(s, j)).join('')}</ol>` +
`<ol>${BRIEFS.slice(half).map((s, j) => brief(s, half + j)).join('')}</ol></div>
<script>
// A two-line headline shrinks as one, so both lines keep the same size.
for (const g of document.querySelectorAll('.group')) {
  const lines = [...g.querySelectorAll('.fit')];
  let f = parseFloat(getComputedStyle(g).fontSize);
  while (lines.some((el) => el.scrollWidth > el.clientWidth + 0.5) && f > 17) { f -= 0.5; g.style.fontSize = f + 'px'; }
}
// Shrink any line that would overflow its box (never below 15px), so no text is cut off.
for (const el of document.querySelectorAll('.fit')) {
  let f = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth + 0.5 && f > 15) { f -= 0.5; el.style.fontSize = f + 'px'; }
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
if (!browser) throw new Error('no Chromium browser found; pass its path as the third argument');

const outPng = join(root, 'entry.png');
execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  '--window-size=1024,1024', '--virtual-time-budget=3000', `--user-data-dir=${join(buildDir, 'profile')}`,
  `--screenshot=${outPng}`, 'file:///' + htmlPath.replaceAll('\\', '/')], { stdio: 'inherit' });
console.log(`wrote ${outPng} (${statSync(outPng).size} bytes), map ${MAP.w}x${MAP.h}`);
