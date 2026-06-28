/**
 * Vercel Serverless Function — /api/schedule/sheet
 * Proxy que lê uma planilha do Google (exportada como CSV) e devolve o texto bruto.
 * Roda no servidor para evitar bloqueio de CORS e para não depender de credenciais
 * (a planilha precisa estar compartilhada como "qualquer pessoa com o link pode ver"
 * ou publicada na web).
 *
 * Uso: /api/schedule/sheet?id=<ID_OU_URL>&gid=<ABA>
 * Fallback: variável de ambiente SCHEDULE_SHEET_ID.
 */

export default async function handler(req: any, res: any) {
  const raw = String(req.query?.id ?? process.env.SCHEDULE_SHEET_ID ?? '').trim();
  const gid = String(req.query?.gid ?? '0').trim();

  // Aceita tanto o ID puro quanto a URL completa da planilha
  const match = raw.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = match ? match[1] : raw;

  if (!sheetId) {
    res.status(400).json({ error: 'Missing sheet id (?id=) ou SCHEDULE_SHEET_ID' });
    return;
  }

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;

  try {
    const r = await fetch(url, { redirect: 'follow' });
    const text = await r.text();

    // Quando a planilha não é pública, o Google devolve uma página HTML de login
    if (!r.ok || /^\s*<(!doctype|html)/i.test(text)) {
      res.status(502).json({
        error: 'Não foi possível ler a planilha. Confirme que ela está compartilhada como "qualquer pessoa com o link pode ver".',
        status: r.status,
      });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ csv: text });
  } catch (err) {
    console.error('[schedule/sheet] exception', err);
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
}
