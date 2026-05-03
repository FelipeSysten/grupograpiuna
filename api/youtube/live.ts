/**
 * Vercel Serverless Function — /api/youtube/live
 * Consulta a YouTube Data API v3 server-side, mantendo a chave fora do bundle.
 * Resposta:
 *   {
 *     viewers: number,        // espectadores simultâneos da live (0 se offline)
 *     isLive: boolean,
 *     subscribers: number,    // inscritos do canal
 *     totalViews: number,     // visualizações totais do canal
 *     videoCount: number,     // total de vídeos publicados
 *     channelTitle: string
 *   }
 */

export default async function handler(req: any, res: any) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

  // Cache na borda — channel stats mudam devagar; live é re-checada a cada 30s no client
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (!API_KEY || !CHANNEL_ID) {
    res.status(500).json({ error: 'Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID' });
    return;
  }

  try {
    const [searchRes, channelRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`),
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${API_KEY}`),
    ]);

    let viewers = 0;
    let isLive = false;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const liveVideoId: string | undefined = searchData.items?.[0]?.id?.videoId;
      if (liveVideoId) {
        isLive = true;
        const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${liveVideoId}&key=${API_KEY}`);
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          const concurrent = videoData.items?.[0]?.liveStreamingDetails?.concurrentViewers;
          viewers = concurrent ? parseInt(concurrent, 10) : 0;
        } else {
          const body = await videoRes.json().catch(() => null);
          console.error('[youtube/live] videos failed', videoRes.status, body?.error ?? body);
        }
      }
    } else {
      const body = await searchRes.json().catch(() => null);
      console.error('[youtube/live] search failed', searchRes.status, body?.error ?? body);
    }

    let subscribers = 0;
    let totalViews = 0;
    let videoCount = 0;
    let channelTitle = '';
    if (channelRes.ok) {
      const channelData = await channelRes.json();
      const stats = channelData.items?.[0]?.statistics;
      const snippet = channelData.items?.[0]?.snippet;
      if (stats) {
        subscribers = parseInt(stats.subscriberCount ?? '0', 10);
        totalViews = parseInt(stats.viewCount ?? '0', 10);
        videoCount = parseInt(stats.videoCount ?? '0', 10);
      }
      if (snippet) channelTitle = snippet.title ?? '';
    } else {
      const body = await channelRes.json().catch(() => null);
      console.error('[youtube/live] channels failed', channelRes.status, body?.error ?? body);
    }

    res.status(200).json({ viewers, isLive, subscribers, totalViews, videoCount, channelTitle });
  } catch (err) {
    console.error('[youtube/live] exception', err);
    res.status(500).json({ error: 'fetch failed' });
  }
}
