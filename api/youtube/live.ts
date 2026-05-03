/**
 * Vercel Serverless Function — /api/youtube/live
 * Consulta a YouTube Data API v3 server-side, mantendo a chave fora do bundle.
 * Resposta: { viewers: number }
 */

export default async function handler(req: any, res: any) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

  // Cache leve na borda — evita estourar quota com clientes simultâneos
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=30');

  if (!API_KEY || !CHANNEL_ID) {
    res.status(500).json({ viewers: 0, error: 'Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID' });
    return;
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const body = await searchRes.json().catch(() => null);
      console.error('[youtube/live] search failed', searchRes.status, body?.error ?? body);
      res.status(searchRes.status).json({ viewers: 0 });
      return;
    }
    const searchData = await searchRes.json();
    const liveVideoId: string | undefined = searchData.items?.[0]?.id?.videoId;
    if (!liveVideoId) {
      res.status(200).json({ viewers: 0 });
      return;
    }

    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${liveVideoId}&key=${API_KEY}`;
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) {
      const body = await videoRes.json().catch(() => null);
      console.error('[youtube/live] videos failed', videoRes.status, body?.error ?? body);
      res.status(videoRes.status).json({ viewers: 0 });
      return;
    }
    const videoData = await videoRes.json();
    const concurrent = videoData.items?.[0]?.liveStreamingDetails?.concurrentViewers;
    res.status(200).json({ viewers: concurrent ? parseInt(concurrent, 10) : 0 });
  } catch (err) {
    console.error('[youtube/live] exception', err);
    res.status(500).json({ viewers: 0 });
  }
}
