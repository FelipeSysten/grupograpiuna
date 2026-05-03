/**
 * Vercel Serverless Function — /api/youtube/channel
 * Estatísticas do canal: inscritos, views totais, vídeos publicados.
 * Custa 1 unit por chamada (channels.list), bem mais barato que a /live.
 * Cache de 1h: dados mudam devagar.
 */

export default async function handler(req: any, res: any) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  if (!API_KEY || !CHANNEL_ID) {
    res.status(500).json({
      error: 'Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID',
      hasKey: !!API_KEY,
      hasChannelId: !!CHANNEL_ID,
    });
    return;
  }

  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${API_KEY}`);
    if (!r.ok) {
      const body = await r.json().catch(() => null);
      res.status(200).json({
        subscribers: 0, totalViews: 0, videoCount: 0, channelTitle: '',
        error: {
          status: r.status,
          reason: body?.error?.errors?.[0]?.reason,
          message: body?.error?.message,
        },
      });
      return;
    }
    const data = await r.json();
    const stats = data.items?.[0]?.statistics ?? {};
    const snippet = data.items?.[0]?.snippet ?? {};
    res.status(200).json({
      subscribers: parseInt(stats.subscriberCount ?? '0', 10),
      totalViews: parseInt(stats.viewCount ?? '0', 10),
      videoCount: parseInt(stats.videoCount ?? '0', 10),
      channelTitle: snippet.title ?? '',
    });
  } catch (err) {
    console.error('[youtube/channel] exception', err);
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
}
