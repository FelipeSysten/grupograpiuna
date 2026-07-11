/**
 * Vercel Serverless Function — /api/instagram/media
 * Mídias recentes (posts e reels) da conta Instagram Business, para a seção
 * "Stories & Reels" do portal. Endpoint leve: não expõe métricas de conta e
 * não faz as chamadas extras de insights por vídeo.
 *
 * Variáveis de ambiente (as mesmas do /api/instagram/insights):
 *   INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID
 *
 * Autocontida de propósito (sem imports locais): funções serverless da Vercel
 * rodam em ESM e import entre arquivos pode falhar no runtime.
 * Cache 15min na CDN — página pública com muitos acessos.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export default async function handler(req: any, res: any) {
  const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
  const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');

  // Não configurado → 200 vazio (o strip simplesmente não mostra itens do IG)
  if (!TOKEN || !IG_ID) {
    res.status(200).json({ configured: false, media: [] });
    return;
  }

  const limit = Math.min(Math.max(parseInt(String(req.query?.limit ?? '12'), 10) || 12, 1), 25);

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const r = await fetch(`${GRAPH}/${IG_ID}/media?fields=${fields}&limit=${limit}&access_token=${TOKEN}`);
    const data = await r.json().catch(() => null);

    if (!r.ok || !Array.isArray(data?.data)) {
      res.status(200).json({ configured: true, media: [], error: data?.error?.message });
      return;
    }

    const media = data.data.map((item: any) => ({
      id: item.id,
      caption: item.caption ?? '',
      mediaType: item.media_type ?? '',
      // Vídeos/reels não têm imagem direta — usamos a thumbnail
      mediaUrl: item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url,
      permalink: item.permalink ?? '',
      timestamp: item.timestamp ?? '',
    }));

    res.status(200).json({ configured: true, media });
  } catch (err) {
    console.error('[instagram/media] exception', err);
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
}
