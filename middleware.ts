/**
 * Vercel Edge Middleware
 * Intercepta requisições de crawlers (WhatsApp, Facebook, Telegram, etc.) para
 * /noticias/:id e as reescreve para /api/og?id=:id, que retorna HTML com OG tags.
 * Visitantes humanos passam diretamente para a SPA React.
 *
 * Executa no Edge Runtime (antes dos rewrites do vercel.json).
 */

export const config = { matcher: ['/noticias/:path+'] };

const BOT_PATTERN =
  /facebookexternalhit|WhatsApp|Twitterbot|Telegram|Slackbot|LinkedInBot|Discordbot|Googlebot|bingbot|DuckDuckBot|Applebot/i;

export default async function middleware(request: Request): Promise<Response | void> {
  const ua = request.headers.get('user-agent') ?? '';

  if (!BOT_PATTERN.test(ua)) {
    // Visitante humano — continua normalmente para a SPA
    return;
  }

  const url = new URL(request.url);
  // /noticias/ABC123  →  id = "ABC123"
  const segments = url.pathname.split('/').filter(Boolean);
  const newsId = segments[segments.length - 1];

  if (!newsId || newsId === 'noticias') return;

  const ogUrl = new URL(`/api/og?id=${encodeURIComponent(newsId)}`, url.origin);

  // Faz fetch interno e retorna a resposta como se fosse a própria rota (rewrite transparente)
  return fetch(ogUrl.toString(), {
    headers: {
      'x-forwarded-host': url.host,
      'x-forwarded-proto': url.protocol.replace(':', ''),
    },
  });
}
