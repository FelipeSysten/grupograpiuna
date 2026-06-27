/**
 * Vercel Serverless Function — /api/instagram/insights
 * Perfil, insights (alcance / visitas ao perfil) e mídias recentes da conta
 * Instagram Business/Creator via Instagram Graph API.
 *
 * Variáveis de ambiente (NUNCA expor ao cliente):
 *   INSTAGRAM_ACCESS_TOKEN        — token de longa duração (System User / Page)
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID — ID da conta IG Business vinculada à Página
 *
 * Autocontida de propósito (sem imports locais): funções serverless da Vercel
 * rodam em ESM e import entre arquivos pode falhar no runtime.
 * Cache 30min na CDN: insights mudam devagar e a Graph API tem rate limit.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

async function gget(url: string) {
  const r = await fetch(url);
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

export default async function handler(req: any, res: any) {
  const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
  const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  // Ainda não configurado: responde 200 vazio (o dashboard mostra zeros sem erro)
  if (!TOKEN || !IG_ID) {
    res.status(200).json({
      configured: false,
      profile: { username: '', name: '', profilePictureUrl: '', followers: 0, mediaCount: 0 },
      insights: { reach: 0, profileViews: 0 },
      media: [],
    });
    return;
  }

  const errors: { source: string; status?: number; message?: string }[] = [];

  try {
    // 1) Perfil — campos básicos (confiável, 1 chamada)
    const profile = { username: '', name: '', profilePictureUrl: '', followers: 0, mediaCount: 0 };
    {
      const fields = 'username,name,profile_picture_url,followers_count,media_count';
      const { ok, status, data } = await gget(`${GRAPH}/${IG_ID}?fields=${fields}&access_token=${TOKEN}`);
      if (ok && data) {
        profile.username = data.username ?? '';
        profile.name = data.name ?? '';
        profile.profilePictureUrl = data.profile_picture_url ?? '';
        profile.followers = data.followers_count ?? 0;
        profile.mediaCount = data.media_count ?? 0;
      } else {
        errors.push({ source: 'profile', status, message: data?.error?.message });
      }
    }

    // 2) Insights da conta — alcance e visitas ao perfil. Best-effort: nomes/
    //    períodos de métrica variam conforme a versão da API e o tipo de conta.
    const insights = { reach: 0, profileViews: 0 };
    {
      const { ok, status, data } = await gget(
        `${GRAPH}/${IG_ID}/insights?metric=reach,profile_views&period=day&metric_type=total_value&access_token=${TOKEN}`,
      );
      if (ok && Array.isArray(data?.data)) {
        for (const m of data.data) {
          const value = m?.total_value?.value ?? m?.values?.[0]?.value ?? 0;
          if (m.name === 'reach') insights.reach = value;
          if (m.name === 'profile_views') insights.profileViews = value;
        }
      } else {
        errors.push({ source: 'insights', status, message: data?.error?.message });
      }
    }

    // 3) Mídias recentes + engajamento (1 chamada) e views por vídeo (best-effort)
    const media: any[] = [];
    {
      const fields =
        'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
      const { ok, status, data } = await gget(
        `${GRAPH}/${IG_ID}/media?fields=${fields}&limit=12&access_token=${TOKEN}`,
      );
      if (ok && Array.isArray(data?.data)) {
        for (const item of data.data) {
          media.push({
            id: item.id,
            caption: item.caption ?? '',
            mediaType: item.media_type ?? '',
            mediaUrl: item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url,
            permalink: item.permalink ?? '',
            timestamp: item.timestamp ?? '',
            likes: item.like_count ?? 0,
            comments: item.comments_count ?? 0,
            views: 0,
          });
        }
        await Promise.all(
          media.map(async (m) => {
            if (m.mediaType !== 'VIDEO') return;
            const r = await gget(`${GRAPH}/${m.id}/insights?metric=views&access_token=${TOKEN}`);
            const v = r.data?.data?.[0]?.values?.[0]?.value ?? r.data?.data?.[0]?.total_value?.value;
            if (typeof v === 'number') m.views = v;
          }),
        );
      } else {
        errors.push({ source: 'media', status, message: data?.error?.message });
      }
    }

    res.status(200).json({ configured: true, profile, insights, media, ...(errors.length ? { errors } : {}) });
  } catch (err) {
    console.error('[instagram/insights] exception', err);
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
}
