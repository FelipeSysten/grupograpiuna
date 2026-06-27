/**
 * Vercel Serverless Function — /api/instagram/insights
 * Perfil, insights (alcance / visitas ao perfil) e mídias recentes da conta
 * Instagram Business/Creator via Instagram Graph API.
 *
 * Variáveis de ambiente (NUNCA expor ao cliente):
 *   INSTAGRAM_ACCESS_TOKEN        — token de longa duração (System User / Page)
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID — ID da conta IG Business vinculada à Página
 *
 * Cache 30min na CDN: insights mudam devagar e a Graph API tem rate limit.
 */
import { fetchInstagramInsights } from '../_lib/instagram';

export default async function handler(req: any, res: any) {
  const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
  const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  if (!TOKEN || !IG_ID) {
    res.status(500).json({
      error: 'Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID',
      hasToken: !!TOKEN,
      hasAccountId: !!IG_ID,
    });
    return;
  }

  try {
    const payload = await fetchInstagramInsights(TOKEN, IG_ID);
    res.status(200).json(payload);
  } catch (err) {
    console.error('[instagram/insights] exception', err);
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
}
