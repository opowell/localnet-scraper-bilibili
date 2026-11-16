import { afterEach, describe, expect, it } from 'vitest'
import { parserLoader, resetPage, visit } from '#scraper-test'

// The parser, evaluated with the helpers it is injected with, as a scrape runs it.
const load = parserLoader(__dirname)

afterEach(resetPage)

describe('bilibili', () => {
  it('reads a video from its JSON-LD, as Bilibili\'s player for it', async () => {
    const { parseBilibili } = load('bilibili.js', ['parseBilibili'])
    visit('https://www.bilibili.com/en/video/BV11MsP6SEzt/?spm_id_from=x', `
      <script type="application/ld+json">${JSON.stringify({
        '@type': 'VideoObject',
        'name': 'Arrived in Kazakhstan',
        'description': 'A long drive.',
        'thumbnailUrl': ['https://i0.hdslb.com/cover.jpg'],
        'embedUrl': 'https://player.bilibili.com/player.html?bvid=BV11MsP6SEzt',
        'uploadDate': '2026-11-16T09:54:41.000Z',
        'duration': 'PT00H10M38S',
        'author': { '@type': 'Person', 'name': '拉宏桑', 'url': 'https://space.bilibili.com/11870568' },
        'interactionStatistic': [
          { interactionType: { '@type': 'WatchAction' }, userInteractionCount: 179238 },
          { interactionType: { '@type': 'LikeAction' }, userInteractionCount: 12021 },
        ],
        'keywords': ['Travel'],
      })}</script>
      <a href="/en/video/BV1ZxsP6ME93/?spm=1">Next</a>`)
    const parsed = await parseBilibili()
    expect(parsed.title).toBe('Arrived in Kazakhstan')
    expect(parsed.content).toEqual([
      '<post author="拉宏桑" author-url="https://space.bilibili.com/11870568">',
      '[![](https://i0.hdslb.com/cover.jpg)](https://player.bilibili.com/player.html?bvid=BV11MsP6SEzt)',
      'A long drive.',
    ])
    expect(parsed.links).toEqual([
      { url: 'https://search.bilibili.com/all?keyword=Travel', title: 'Travel', score: 0.5 },
      { url: 'https://www.bilibili.com/en/video/BV1ZxsP6ME93/', score: 1 },
      { url: 'https://space.bilibili.com/11870568', score: 1 },
    ])
    expect(Object.fromEntries(parsed.details)).toMatchObject({ minutes: 11, views: 179238, published: '2026-11-16', likes: 12021 })
  })

  it('reads the main site\'s video from the data it writes for its app', async () => {
    const { parseBilibili } = load('bilibili.js', ['parseBilibili'])
    const state = { videoData: { title: '视频', desc: '简介', pic: 'https://i0.hdslb.com/p.jpg', owner: { name: 'UP', mid: 7 }, duration: 120, pubdate: 1794860611, stat: { view: 50, like: 5, reply: 1 } } }
    visit('https://www.bilibili.com/video/BV1aa/', `<script>window.__INITIAL_STATE__=${JSON.stringify(state)};(function(){var s;}());</script>`)
    const parsed = await parseBilibili()
    expect(parsed.title).toBe('视频')
    expect(parsed.content[1]).toBe('[![](https://i0.hdslb.com/p.jpg)](https://player.bilibili.com/player.html?bvid=BV1aa&autoplay=0)')
    expect(Object.fromEntries(parsed.details)).toMatchObject({ minutes: 2, views: 50, likes: 5, comments: 1 })
  })
})
