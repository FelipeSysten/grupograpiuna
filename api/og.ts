/**
 * Vercel Serverless Function — /api/og
 * Retorna HTML com Open Graph meta tags para crawlers (WhatsApp, Facebook, etc.)
 * Chamada pelo Edge Middleware em middleware.ts quando detecta user-agent de bot.
 */

const PROJECT_ID = 'gen-lang-client-0101136724';
const DATABASE_ID = 'ai-studio-0154e963-dfef-44b7-90a1-038646e49104';
// Firebase Web API key — idêntica à que já está no bundle do cliente, não é segredo.
const FIREBASE_API_KEY = 'AIzaSyAGhl5ZKl5Y1jMlu4GencMe0mrr89Sm8kM';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStringValue(field: any): string {
  return field?.stringValue ?? '';
}

export default async function handler(req: any, res: any) {
  const id = String(req.query?.id ?? '').trim();

  if (!id) {
    res.status(400).send('Missing id');
    return;
  }

  // Constrói URL canônica a partir do host real da requisição
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'grupograpiuna.com.br';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const SITE_URL = `${protocol}://${host}`;
  const canonicalUrl = `${SITE_URL}/noticias/${encodeURIComponent(id)}`;

  const firestoreUrl =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/news/${id}?key=${FIREBASE_API_KEY}`;

  try {
    const response = await fetch(firestoreUrl);

    if (!response.ok) {
      res.status(404).send('Notícia não encontrada');
      return;
    }

    const data = await response.json();
    const fields = data.fields ?? {};

    const title       = escapeHtml(getStringValue(fields.title));
    const imageUrl    = escapeHtml(getStringValue(fields.imageUrl));
    const category    = escapeHtml(getStringValue(fields.category));
    const rawContent  = getStringValue(fields.content);

    // Gera excerpt: remove marcação Markdown e limita a 200 chars
    const excerpt = escapeHtml(
      rawContent
        .replace(/!\[.*?\]\(.*?\)/g, '')   // imagens markdown
        .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // links markdown
        .replace(/[#*_`>~]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200)
    );

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Grupo Grapiúna</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Grupo Grapiúna de Comunicação" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${excerpt}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="article:section" content="${category}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${excerpt}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- Redireciona visitantes humanos que caírem nesta rota para a SPA -->
  <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
  <link rel="canonical" href="${canonicalUrl}" />
</head>
<body>
  <p><a href="${canonicalUrl}">${title}</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache de 1 hora na CDN, revalidação em background por até 24h
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(html);

  } catch (error) {
    console.error('[og] error:', error);
    res.status(500).send('Erro interno');
  }
}
