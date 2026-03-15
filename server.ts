import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("prompts.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    modality TEXT NOT NULL,
    result TEXT,
    tokens INTEGER DEFAULT 0,
    cost REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration for existing tables
try {
  const columns = db.prepare("PRAGMA table_info(prompts)").all() as any[];
  if (!columns.find(c => c.name === 'tokens')) {
    db.exec("ALTER TABLE prompts ADD COLUMN tokens INTEGER DEFAULT 0");
  }
  if (!columns.find(c => c.name === 'cost')) {
    db.exec("ALTER TABLE prompts ADD COLUMN cost REAL DEFAULT 0.0");
  }
  if (!columns.find(c => c.name === 'result')) {
    db.exec("ALTER TABLE prompts ADD COLUMN result TEXT");
  }
} catch (e) {
  console.error("Migration error:", e);
}

const ESTIMATED_COSTS = {
  text: 0.00001, // per token
  code: 0.00001, // per token
  image: 0.02,   // per generation
  video: 0.15    // per generation
};

function estimateTokens(text: string) {
  return Math.ceil((text || "").length / 4);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

  // AI Clients
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  // API Routes
  app.get("/api/prompts", (req, res) => {
    const prompts = db.prepare("SELECT * FROM prompts ORDER BY created_at DESC").all();
    res.json(prompts);
  });

  app.post("/api/prompts", (req, res) => {
    const { title, content, modality, result } = req.body;
    
    let tokens = 0;
    let cost = 0;

    if (modality === 'text' || modality === 'code') {
      tokens = estimateTokens(content) + estimateTokens(result || "");
      cost = tokens * ESTIMATED_COSTS[modality as keyof typeof ESTIMATED_COSTS];
    } else {
      tokens = 1; // 1 unit
      cost = ESTIMATED_COSTS[modality as keyof typeof ESTIMATED_COSTS] || 0;
    }

    const info = db.prepare("INSERT INTO prompts (title, content, modality, result, tokens, cost) VALUES (?, ?, ?, ?, ?, ?)").run(title, content, modality, result, tokens, cost);
    res.json({ id: info.lastInsertRowid, title, content, modality, result, tokens, cost });
  });

  // OpenAI Proxy
  app.post("/api/ai/openai", async (req, res) => {
    if (!openai) return res.status(503).json({ error: "OpenAI not configured" });
    const { model, prompt, systemInstruction } = req.body;
    try {
      const response = await openai.chat.completions.create({
        model: model || "gpt-4o",
        messages: [
          { role: "system", content: systemInstruction || "You are a helpful assistant." },
          { role: "user", content: prompt }
        ],
      });
      res.json({ text: response.choices[0].message.content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stability AI Proxy
  app.post("/api/ai/stability", async (req, res) => {
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Stability AI not configured" });
    const { prompt, width, height, samples } = req.body;
    
    try {
      const response = await fetch(
        "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            text_prompts: [{ text: prompt }],
            cfg_scale: 7,
            height: height || 1024,
            width: width || 1024,
            steps: 30,
            samples: samples || 1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Non-200 response: ${await response.text()}`);
      }

      const responseJSON = await response.json() as any;
      const base64 = responseJSON.artifacts[0].base64;
      res.json({ image: `data:image/png;base64,${base64}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        modality,
        COUNT(*) as count,
        SUM(tokens) as total_units,
        SUM(cost) as total_cost
      FROM prompts
      GROUP BY modality
    `).all();

    const dailyUsage = db.prepare(`
      SELECT 
        date(created_at) as date,
        modality,
        SUM(cost) as cost
      FROM prompts
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date, modality
      ORDER BY date ASC
    `).all();

    res.json({ stats, dailyUsage });
  });

  app.delete("/api/prompts/:id", (req, res) => {
    db.prepare("DELETE FROM prompts WHERE id = ?").run(req.params.id);
    res.status(204).end();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
