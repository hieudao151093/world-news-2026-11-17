// World news of Tuesday 17 November 2026 in one image.
// The picture is rendered ahead of time by tools/build.mjs into entry.png beside this file; at grading time this
// program (Node 22, standard library only, no network) copies those exact bytes to /output/entry.png, so every run
// writes an identical file. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const png = readFileSync(new URL('./entry.png', import.meta.url));

// Guard the contest limits before writing: a PNG signature, at most 1 MiB, at most 1024 x 1024 pixels.
const isPng = png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (!isPng || png.length > 1048576 || width > 1024 || height > 1024) {
  throw new Error(`entry.png breaks the limits: png=${isPng} bytes=${png.length} size=${width}x${height}`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
