/**
 * Lógica compartilhada da integração com a Instagram Graph API (Meta).
 * Usada tanto pela função serverless (api/instagram/insights.ts) quanto pelo
 * mirror de desenvolvimento no server.ts.
 *
 * Arquivos/pastas com "_" no início NÃO viram endpoints na Vercel — este é só
 * um módulo importável, não uma rota.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export type IgMedia = {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  permalink: string;
  timestamp: string;
  likes: number;
  comments: number;
  views: number;
};

export type IgPayload = {
  profile: {
    username: string;
    name: string;
    profilePictureUrl: string;
    followers: number;
    mediaCount: number;
  };
  insights: { reach: number; profileViews: number };
  media: IgMedia[];
  errors?: { source: string; status?: number; message?: string }[];
};

async function gget(url: string) {
  const r = await fetch(url);
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

export async function fetchInstagramInsights(token: string, igId: string): Promise<IgPayload> {
  const errors: NonNullable<IgPayload['errors']> = [];

  // 1) Perfil — campos básicos (confiável, 1 chamada)
  const profile = { username: '', name: '', profilePictureUrl: '', followers: 0, mediaCount: 0 };
  {
    const fields = 'username,name,profile_picture_url,followers_count,media_count';
    const { ok, status, data } = await gget(`${GRAPH}/${igId}?fields=${fields}&access_token=${token}`);
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

  // 2) Insights da conta — alcance e visitas ao perfil. Best-effort: os nomes/
  //    períodos de métrica variam conforme a versão da Graph API e o tipo de conta.
  const insights = { reach: 0, profileViews: 0 };
  {
    const { ok, status, data } = await gget(
      `${GRAPH}/${igId}/insights?metric=reach,profile_views&period=day&metric_type=total_value&access_token=${token}`,
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
  const media: IgMedia[] = [];
  {
    const fields =
      'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
    const { ok, status, data } = await gget(
      `${GRAPH}/${igId}/media?fields=${fields}&limit=12&access_token=${token}`,
    );
    if (ok && Array.isArray(data?.data)) {
      for (const item of data.data) {
        media.push({
          id: item.id,
          caption: item.caption ?? '',
          mediaType: item.media_type ?? '',
          // Vídeos/reels não têm imagem direta — usamos a thumbnail
          mediaUrl: item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url,
          permalink: item.permalink ?? '',
          timestamp: item.timestamp ?? '',
          likes: item.like_count ?? 0,
          comments: item.comments_count ?? 0,
          views: 0,
        });
      }
      // Visualizações por vídeo/reels — best-effort (a métrica depende da versão da API)
      await Promise.all(
        media.map(async (m) => {
          if (m.mediaType !== 'VIDEO') return;
          const r = await gget(`${GRAPH}/${m.id}/insights?metric=views&access_token=${token}`);
          const v = r.data?.data?.[0]?.values?.[0]?.value ?? r.data?.data?.[0]?.total_value?.value;
          if (typeof v === 'number') m.views = v;
        }),
      );
    } else {
      errors.push({ source: 'media', status, message: data?.error?.message });
    }
  }

  return { profile, insights, media, ...(errors.length ? { errors } : {}) };
}
