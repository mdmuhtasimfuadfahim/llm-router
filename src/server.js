import "dotenv/config";
import express from "express";
import crypto from "crypto";
import { OpenAI } from "openai";
import { cacheGet, cacheSetEx } from "./cache.js";
import { estimateCostUSD } from "./cost.js";
import { classify } from "./classifier/infer.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TTL = Number(process.env.CACHE_TTL_SECONDS || 3600);
const LOW = process.env.LOW_MODEL || "gpt-3.5-turbo";
const HIGH = process.env.HIGH_MODEL || "gpt-4o";

function keyFor(text) {
  return "resp:" + crypto.createHash("sha1").update(text.trim()).digest("hex");
}

async function ask(model, prompt) {
  const t0 = Date.now();
  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }]
  });
  const answer = resp.choices?.[0]?.message?.content || "";
  const latency_ms = Date.now() - t0;
  const cost_usd = await estimateCostUSD(model, prompt, answer);
  return { answer, latency_ms, cost_usd, model };
}

app.post("/chat", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "");
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    // Checking from cache if the response is already cached
    const k = keyFor(prompt);
    const cached = await cacheGet(k);
    // returning response from cache
    if (cached) return res.json({ ...cached, cache_hit: true });

    // Classifying the prompt
    const cls = await classify(prompt);

    // Selecting model based on classification
    const model = cls === 1 ? HIGH : LOW;

    // Asking the model for a response
    const out = await ask(model, prompt);

    // Caching the response
    await cacheSetEx(k, TTL, { ...out, cache_hit: false });
    res.json(out);
  } catch (e) {
    console.error("Error in /chat endpoint:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (_, res) => res.type("text").send("OK"));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log("Server listening on", port));