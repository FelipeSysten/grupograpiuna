import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Espelha o serverless de produção em api/youtube/live.ts para dev local
  app.get("/api/youtube/live", async (_req, res) => {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

    if (!API_KEY || !CHANNEL_ID) {
      res.status(500).json({ error: "Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID" });
      return;
    }

    try {
      const [searchRes, channelRes] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`),
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${API_KEY}`),
      ]);

      let viewers = 0;
      let isLive = false;
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const liveVideoId: string | undefined = searchData.items?.[0]?.id?.videoId;
        if (liveVideoId) {
          isLive = true;
          const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${liveVideoId}&key=${API_KEY}`);
          if (videoRes.ok) {
            const videoData = await videoRes.json();
            const concurrent = videoData.items?.[0]?.liveStreamingDetails?.concurrentViewers;
            viewers = concurrent ? parseInt(concurrent, 10) : 0;
          } else {
            const body = await videoRes.json().catch(() => null);
            console.error("[youtube/live] videos failed", videoRes.status, body?.error ?? body);
          }
        }
      } else {
        const body = await searchRes.json().catch(() => null);
        console.error("[youtube/live] search failed", searchRes.status, body?.error ?? body);
      }

      let subscribers = 0;
      let totalViews = 0;
      let videoCount = 0;
      let channelTitle = "";
      if (channelRes.ok) {
        const channelData = await channelRes.json();
        const stats = channelData.items?.[0]?.statistics;
        const snippet = channelData.items?.[0]?.snippet;
        if (stats) {
          subscribers = parseInt(stats.subscriberCount ?? "0", 10);
          totalViews = parseInt(stats.viewCount ?? "0", 10);
          videoCount = parseInt(stats.videoCount ?? "0", 10);
        }
        if (snippet) channelTitle = snippet.title ?? "";
      } else {
        const body = await channelRes.json().catch(() => null);
        console.error("[youtube/live] channels failed", channelRes.status, body?.error ?? body);
      }

      res.status(200).json({ viewers, isLive, subscribers, totalViews, videoCount, channelTitle });
    } catch (err) {
      console.error("[youtube/live] exception", err);
      res.status(500).json({ error: "fetch failed" });
    }
  });

  // Mock data for news
  app.get("/api/news", (req, res) => {
    res.json([
      {
        id: 1,
        title: "Expansão do Agronegócio no Sul da Bahia",
        category: "Economia",
        excerpt: "Novas tecnologias impulsionam a produtividade de cacau na região...",
        author: "Redação Grapiúna",
        date: "2026-03-24",
        image: "https://picsum.photos/seed/cacau/800/600"
      },
      {
        id: 2,
        title: "TV Grapiúna estreia novo programa de debates",
        category: "TV",
        excerpt: "O programa 'Ponto de Vista' trará especialistas para discutir política regional.",
        author: "João Silva",
        date: "2026-03-23",
        image: "https://picsum.photos/seed/tv/800/600"
      },
      {
        id: 3,
        title: "HUB73 anuncia parceria com produtores locais",
        category: "Empresarial",
        excerpt: "A produtora busca fortalecer o ecossistema audiovisual do interior baiano.",
        author: "Maria Oliveira",
        date: "2026-03-22",
        image: "https://picsum.photos/seed/hub73/800/600"
      }
    ]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
