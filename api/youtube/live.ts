/**
 * Vercel Serverless Function — /api/youtube/live
 * Detecta transmissão ao vivo do canal e retorna espectadores simultâneos.
 * Custos: search.list = 100u, videos.list = 1u → ~101u por origin hit.
 * Quota diária padrão: 10.000u. Cache de 15min mantém o consumo abaixo do limite.
 *
 * Resposta: { viewers, isLive, errors? }
 */

type ApiError = { source: string; status: number; reason?: string; message?: string };

async function readGoogleError(res: Response, source: string): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  return {
    source,
    status: res.status,
    reason: body?.error?.errors?.[0]?.reason,
    message: body?.error?.message,
  };
}

export default async function handler(req: any, res: any) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

  // s-maxage=900 (15 min) → no máximo 96 origin hits/dia × 101u = ~9.700u (sob a quota de 10k).
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  if (!API_KEY || !CHANNEL_ID) {
    res.status(500).json({
      error: 'Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID',
      hasKey: !!API_KEY,
      hasChannelId: !!CHANNEL_ID,
    });
    return;
  }

  const errors: ApiError[] = [];

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`
    );

    let viewers = 0;
    let isLive = false;

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const liveVideoId: string | undefined = searchData.items?.[0]?.id?.videoId;
      if (liveVideoId) {
        isLive = true;
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${liveVideoId}&key=${API_KEY}`
        );
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          const concurrent = videoData.items?.[0]?.liveStreamingDetails?.concurrentViewers;
          viewers = concurrent ? parseInt(concurrent, 10) : 0;
        } else {
          errors.push(await readGoogleError(videoRes, 'videos'));
        }
      }
    } else {
      errors.push(await readGoogleError(searchRes, 'search'));
    }

    const payload: any = { viewers, isLive };
    if (errors.length) payload.errors = errors;
    res.status(200).json(payload);
  } catch (err) {
    console.error('[youtube/live] exception', err);
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
}
