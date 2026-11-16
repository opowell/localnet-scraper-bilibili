// A video's address without its tracking: https://www.bilibili.com/video/BV11MsP6SEzt/ (or /en/video/… on the English
// site), null for any other.
function bilibiliVideoUrl(href) {
  const url = new URL(href, location.href)
  const match = /^(\/en)?\/video\/(BV[0-9A-Za-z]+)/.exec(url.pathname)
  return match ? `https://www.bilibili.com${match[1] || ''}/video/${match[2]}/` : null
}

// The data the main site writes for its app (window.__INITIAL_STATE__ = {…};), or {} where it writes none.
function bilibiliState() {
  const script = Array.from(document.querySelectorAll('script:not([src])')).find(element => /window\.__INITIAL_STATE__\s*=\s*\{/.test(element.textContent))
  try {
    const text = script.textContent.replace(/^[\s\S]*?window\.__INITIAL_STATE__\s*=\s*/, '')
    return JSON.parse(text.slice(0, text.lastIndexOf('};') + 1))
  } catch {
    return {}
  }
}

// A count from the page's JSON-LD interactionStatistic of this kind ("LikeAction"), null if it gives none.
function bilibiliCount(video, kind) {
  const counter = [video.interactionStatistic].flat().find(stat => JSON.stringify(stat?.interactionType || '').includes(kind))
  const count = Number(counter?.userInteractionCount)
  return Number.isFinite(count) ? count : null
}

// A video (/video/BV11MsP6SEzt/, or /en/video/… on the English site) reads as its title, then Bilibili's player for it
// (which Read plays, see source.json) with its cover, headed by its uploader, then its description, through videoPage.
// Its details are its uploader, keywords as tags, minutes, views, published day, likes and comments, from its JSON-LD
// VideoObject, or from the data the main site writes for its app where it gives none. It links with weight 1 to its
// uploader's space, with 0.5 to a search for each keyword, and with 1 / (1 + rank / 10) to the videos the page shows
// beside it.
function bilibiliVideo() {
  const [video = {}] = jsonLd('VideoObject')
  const data = bilibiliState().videoData || {}
  const bvid = /\/video\/(BV[0-9A-Za-z]+)/.exec(location.pathname)[1]
  const author = jsonLdPeople(video.author)[0]
    || (data.owner ? { name: data.owner.name, url: `https://space.bilibili.com/${data.owner.mid}` } : null)
  const keywords = [video.keywords].flat().filter(Boolean).flatMap(word => String(word).split(','))
    .map(word => word.trim()).filter(Boolean)
  const here = bilibiliVideoUrl(location.href)
  const related = [...new Set(linkUrls('a[href*="/video/BV"]').map(bilibiliVideoUrl))].filter(url => url && url !== here)
  const parsed = videoPage({
    player: video.embedUrl || `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0`,
    title: video.name || data.title || document.querySelector('h1')?.innerText.trim(),
    poster: [video.thumbnailUrl].flat()[0] || data.pic || '',
    description: video.description ?? data.desc ?? '',
    authors: author ? [author] : [],
    tags: keywords.map(word => ({ text: word, url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(word)}` })),
    related,
    seconds: isoSeconds(video.duration) || data.duration || null,
    views: bilibiliCount(video, 'WatchAction') ?? data.stat?.view ?? null,
    published: isoTime(video.uploadDate) || (data.pubdate ? new Date(data.pubdate * 1000).toISOString() : null),
  })
  return {
    ...parsed,
    details: [
      ...parsed.details,
      ['likes', bilibiliCount(video, 'LikeAction') ?? data.stat?.like ?? null],
      ['comments', bilibiliCount(video, 'CommentAction') ?? data.stat?.reply ?? null],
    ],
  }
}

// A page of Bilibili: a video (see bilibiliVideo); any other page (the home page, a search, search.bilibili.com; an
// uploader's space, space.bilibili.com) is a listing of the videos it shows. The page draws them with scripts, so they
// are waited for, up to 5 seconds.
async function parseBilibili(_profileId) {
  if (!/(?:^|\.)bilibili\.com$/.test(location.hostname)) {
    return null
  }
  if (location.hostname === 'www.bilibili.com' && /^(\/en)?\/video\/BV/.test(location.pathname)) {
    return bilibiliVideo()
  }
  await waitFor(() => document.querySelector('a[href*="/video/BV"]'), 5000)
  return listingOf(linkUrls('a[href*="/video/BV"]').map(bilibiliVideoUrl)) ?? { listing: true }
}

// The parser a scrape calls.
registerParser(parseBilibili)
