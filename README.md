# Bilibili scraper for Localnet

Reads `bilibili.com` pages for Localnet, a browser extension that is a personal search engine.
Localnet pulls it from here the first time it scrapes such a page, through the
[localnet-scrapers](https://github.com/opowell/localnet-scrapers) scraper source.

- `source.json`: what Localnet reads to know the scraper: its name, the URLs it reads, how the site is searched, the file to run, and that Read plays its videos in Bilibili's own player (`player.bilibili.com/player.html?bvid=…`, `"embed": true`).
- `bilibili.js`: the parser. It is injected into the scraped page after Localnet's DOM helpers (content-scripts/utils/dom.js) and defines `window.__dynamicParser`.
- `bilibili.test.ts`: its unit tests, run from a Localnet checkout (`pnpm parsers pull`, then `pnpm test parsers/localnet-scraper-bilibili`).
- `saved-pages/` (not in git): real pages saved from the site, which Localnet's `e2e/saved-pages.test.ts` scrapes. See Localnet's README.

## What it reads

Outside China, `bilibili.com` sends visitors to its English site (`/en/`), whose video pages describe themselves with a
JSON-LD `VideoObject`; the main site's write their data for their app (`window.__INITIAL_STATE__`'s `videoData`), which
the scraper reads where the JSON-LD gives nothing.

- A video (`/video/BV11MsP6SEzt/`, or `/en/video/…`) reads, through `videoPage` in `content-scripts/utils/dom.js`, as its
  title, then Bilibili's player for it (its JSON-LD `embedUrl`, which Read plays in a frame) with its cover, headed by
  its uploader, then its description. Its details are its uploader, its keywords as tags, minutes, views, published
  day, likes and comments. It links with weight 1 to its uploader's space (`space.bilibili.com/…`), with 0.5 to a search
  for each keyword, and with `1 / (1 + rank / 10)` to the videos the page shows beside it.
- Any other page (the home page, a search, an uploader's space) is a listing of the videos it shows. The page draws
  them with scripts, so they are waited for, up to 5 seconds.
