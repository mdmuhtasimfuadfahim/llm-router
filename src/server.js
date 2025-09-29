import "dotenv/config";
import express from "express";
import crypto from "crypto";
import fs from "fs";
import { OpenAI } from "openai";
import { cacheGet, cacheSetEx } from "./cache.js";
import { estimateCostUSD } from "./cost.js";
import { classify } from "./classifier/infer.js";
import { stringify } from "csv-stringify";
import { parse } from "csv-parse";

const app = express();
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TTL = Number(process.env.CACHE_TTL_SECONDS || 3600);
const SIMPLE_MODEL = process.env.SIMPLE_MODEL || "gpt-3.5-turbo";
const MEDIUM_MODEL = process.env.MEDIUM_MODEL || "gpt-4o";
const HARD_MODEL = process.env.HARD_MODEL || "gpt-4";

let trainingData = new Map();

async function loadTrainingData() {
  try {
    const csvPath = "data/training_data.csv";
    if (fs.existsSync(csvPath)) {
      const fileContent = fs.readFileSync(csvPath, 'utf8');
      const rows = await new Promise((resolve, reject) => {
        const results = [];
        parse(fileContent, { columns: true, skip_empty_lines: true })
          .on('data', (row) => results.push(row))
          .on('end', () => resolve(results))
          .on('error', reject);
      });

      trainingData.clear();
      rows.forEach(row => {
        if (row.text && row.label !== undefined) {
          const normalizedText = row.text.toLowerCase().trim();
          trainingData.set(normalizedText, parseInt(row.label));
        }
      });
      console.log(`Loaded ${trainingData.size} training samples`);
    }
  } catch (error) {
    console.error("Failed to load training data:", error.message);
  }
}

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

async function storeQueryForTraining(text, predictedLabel) {
  const normalizedText = text.toLowerCase().trim();

  if (trainingData.has(normalizedText)) {
    return;
  }

  const csvPath = "data/training_data.csv";
  const exists = fs.existsSync(csvPath);

  const csvStream = fs.createWriteStream(csvPath, { flags: 'a' });
  const csvStringify = stringify({
    header: !exists,
    columns: ["text", "label", "timestamp"]
  });

  csvStringify.pipe(csvStream);
  csvStringify.write({
    text: text.replace(/\n/g, ' ').trim(),
    label: predictedLabel,
    timestamp: new Date().toISOString()
  });
  csvStringify.end();

  trainingData.set(normalizedText, predictedLabel);
}

function getModelFromTrainingData(text) {
  const normalizedText = text.toLowerCase().trim();
  return trainingData.get(normalizedText);
}

function getModelByComplexity(complexity) {
  console.log('Complexity level:', complexity);
  switch (complexity) {
    case 2:
      return HARD_MODEL;
    case 1:
      return MEDIUM_MODEL;
    default:
      return SIMPLE_MODEL;
  }
}

app.post("/chat", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "");
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    const k = keyFor(prompt);
    const cached = await cacheGet(k);
    if (cached) return res.json({ ...cached, cache_hit: true });

    let cls = getModelFromTrainingData(prompt);
    let fromTrainingData = false;

    if (cls !== undefined) {
      fromTrainingData = true;
      console.log(`Found in training data - Label: ${cls} for query: "${prompt}"`);
    } else {
      console.log("Not found in training data, classifying...");
      cls = await classify(prompt);
      console.log(`Classifier prediction - Label: ${cls} for query: "${prompt}"`);

      storeQueryForTraining(prompt, cls).catch(err =>
        console.error("Failed to store query:", err.message)
      );
    }

    const selectedModel = getModelByComplexity(cls);
    console.log(`Selected model: ${selectedModel} (complexity: ${cls})`);

    const out = await ask(selectedModel, prompt);

    await cacheSetEx(k, TTL, {
      ...out,
      cache_hit: false,
      complexity: cls,
      from_training_data: fromTrainingData
    });

    res.json({
      ...out,
      complexity: cls,
      from_training_data: fromTrainingData
    });
  } catch (e) {
    console.error("Error in /chat endpoint:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/stats", async (req, res) => {
  try {
    const stats = {
      models: {
        simple: SIMPLE_MODEL,
        medium: MEDIUM_MODEL,
        hard: HARD_MODEL
      },
      cache_ttl: TTL,
      training_data_count: trainingData.size
    };
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/reload-training", async (req, res) => {
  try {
    await loadTrainingData();
    res.json({
      message: "Training data reloaded",
      count: trainingData.size
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (_, res) => res.type("text").send("LLM Router OK - Three-tier routing active"));

await loadTrainingData();

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`Server listening on ${port} with three-tier routing`));