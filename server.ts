import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for HH API
const hhCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  // HeadHunter API Proxy
  app.get("/api/jobs", async (req, res) => {
    const correlationId = Math.random().toString(36).substring(7);
    
    // Rotation of high-reputation browser User-Agents
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
    ];

    const fetchWithRetry = async (retryCount = 0): Promise<any> => {
      try {
        let { text, page = 0, per_page = 20, area } = req.query;
        if (!text) text = "developer";

        const queryParams = new URLSearchParams({
          text: String(text),
          page: String(page),
          per_page: String(per_page),
        });
        
        if (area && area !== 'undefined' && area !== 'null' && area !== '') {
          queryParams.append('area', String(area));
        }

        const selectedUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        
        // Add a small random jitter delay to avoid bot patterns
        await new Promise(r => setTimeout(r, 100 + Math.random() * 400));

        const hhUrl = `https://api.hh.ru/vacancies?${queryParams.toString()}`;
        console.log(`[${correlationId}] Attempt ${retryCount + 1}: ${hhUrl}`);

        const response = await fetch(hhUrl, {
          method: 'GET',
          headers: {
            "User-Agent": selectedUA,
            "Accept": "application/json",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://hh.ru/",
            "Connection": "keep-alive"
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          if (response.status === 403 && retryCount < 2) {
            console.warn(`[${correlationId}] Got 403, retrying... (${retryCount + 1}/3)`);
            return fetchWithRetry(retryCount + 1);
          }

          throw { status: response.status, details: errorText };
        }

        return await response.json();
      } catch (err: any) {
        if (retryCount < 2) {
          return fetchWithRetry(retryCount + 1);
        }
        throw err;
      }
    };

    try {
      let { text, page = 0, per_page = 20, area } = req.query;
      if (!text) text = "developer";

      const cacheKey = `jobs:${text}:${page}:${per_page}:${area}`;
      const cached = hhCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return res.json(cached.data);
      }

      const data = await fetchWithRetry();
      hhCache.set(cacheKey, { data, timestamp: Date.now() });
      res.json(data);
    } catch (error: any) {
      console.error(`[${correlationId}] Ultimate Failure:`, error);
      res.status(error.status || 500).json({ 
        error: "HeadHunter access temporarily restricted. Please try again in 10 minutes.",
        status: error.status,
        details: error.details?.substring(0, 500)
      });
    }
  });

  // Area suggestions
  app.get("/api/areas", async (req, res) => {
    try {
      const { text } = req.query;
      const response = await fetch(`https://api.hh.ru/suggests/areas?text=${encodeURIComponent(String(text))}`, {
        headers: {
          "User-Agent": "CareerLayerAI/1.2 (tugelbaymadi@gmail.com)",
          "Accept": "application/json",
        },
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch area suggestions" });
    }
  });

  // Get specific vacancy details
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const response = await fetch(`https://api.hh.ru/vacancies/${req.params.id}`, {
        headers: {
          "User-Agent": "CareerLayerAI/1.2 (tugelbaymadi@gmail.com)",
          "Accept": "application/json",
        },
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch vacancy details" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
