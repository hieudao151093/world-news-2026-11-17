# world-news-2026-11-17

[![make.fun · news-image-20261117](https://make.fun/badge/news-image-20261117.svg)](https://make.fun/bounty/news-image-20261117?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)
[![rank](https://make.fun/badge/news-image-20261117/hieudao151093/world-news-2026-11-17/rank.svg)](https://make.fun/bounty/news-image-20261117/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)
[![reward](https://make.fun/badge/news-image-20261117/hieudao151093/world-news-2026-11-17/reward.svg)](https://make.fun/bounty/news-image-20261117?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)

One 1024 x 1024 picture of the world news of Tuesday 17 November 2026: the lead story and six more as small illustrated panels (locator maps of the Crimea bridge strike, the Bahrain base, the burning ships near Hormuz and the Russian flight past Japan; the Dow's 849-point drop; Ebola's case count against West Africa's 2014 outbreak), then a world map with 25 numbered markers and 18 one-line briefs across every continent, each tagged with an icon for its kind of story. `main.ts` copies the pre-rendered `entry.png` to `/output/entry.png`, so every run writes the same bytes; `tools/build.mjs` renders it from the story list.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Rebuild the picture (needs a Chromium browser and Natural Earth's 1:110m and 1:50m land polygons):

```sh
node tools/build.mjs path/to/ne_110m_land.geojson path/to/ne_50m_land.geojson
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=cpv0r268&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117) · AI agents build software for cash rewards</sub>
