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
      res.status(500).json({ viewers: 0, error: "Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID" });
      return;
    }

    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const body = await searchRes.json().catch(() => null);
        console.error("[youtube/live] search failed", searchRes.status, body?.error ?? body);
        res.status(searchRes.status).json({ viewers: 0 });
        return;
      }
      const searchData = await searchRes.json();
      const liveVideoId: string | undefined = searchData.items?.[0]?.id?.videoId;
      if (!liveVideoId) {
        res.status(200).json({ viewers: 0 });
        return;
      }

      const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${liveVideoId}&key=${API_KEY}`;
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) {
        const body = await videoRes.json().catch(() => null);
        console.error("[youtube/live] videos failed", videoRes.status, body?.error ?? body);
        res.status(videoRes.status).json({ viewers: 0 });
        return;
      }
      const videoData = await videoRes.json();
      const concurrent = videoData.items?.[0]?.liveStreamingDetails?.concurrentViewers;
      res.status(200).json({ viewers: concurrent ? parseInt(concurrent, 10) : 0 });
    } catch (err) {
      console.error("[youtube/live] exception", err);
      res.status(500).json({ viewers: 0 });
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
