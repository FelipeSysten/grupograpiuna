/**
 * Vercel Serverless Function — /api/instagram/profile
 * Perfil público da conta Instagram Business (avatar, bio, contadores) para o
 * mockup de celular da página /tv. Não expõe métricas privadas (alcance etc.).
 *
 * Variáveis de ambiente (as mesmas do /api/instagram/insights):
 *   INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID
 *
 * Autocontida de propósito (sem imports locais): funções serverless da Vercel
 * rodam em ESM e import entre arquivos pode falhar no runtime.
 * Cache 30min na CDN — perfil muda devagar.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export default async function handler(_req: any, res: any) {
  const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
  const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  if (!TOKEN || !IG_ID) {
    res.status(200).json({ configured: false, profile: null });
    return;
  }

  try {
    const fields = 'username,name,biography,profile_picture_url,followers_count,follows_count,media_count';
    const r = await fetch(`${GRAPH}/${IG_ID}?fields=${fields}&access_token=${TOKEN}`);
    const data = await r.json().catch(() => null);

    if (!r.ok || !data?.username) {
      res.status(200).json({ configured: true, profile: null, error: data?.error?.message });
      return;
    }

    res.status(200).json({
      configured: true,
      profile: {
        username: data.username ?? '',
        name: data.name ?? '',
        biography: data.biography ?? '',
        profilePictureUrl: data.profile_picture_url ?? '',
        followers: data.followers_count ?? 0,
        follows: data.follows_count ?? 0,
        mediaCount: data.media_count ?? 0,
      },
    });
  } catch (err) {
    console.error('[instagram/profile] exception', err);
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
}
