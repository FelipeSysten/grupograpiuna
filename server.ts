import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
