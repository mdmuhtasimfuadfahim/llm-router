import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
import { parse } from "csv-parse";

// Expect CSV with headers: text,label where label in {0,1,2} (0=simple,1=medium,2=hard)
const path = process.argv[2] || "./data/training_data.csv";
if (!fs.existsSync(path)) {
  console.error("Dataset not found:", path);
  process.exit(1);
}

function loadCSV(p) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(p)
      .pipe(parse({ columns: true, relax_quotes: true, skip_empty_lines: true }))
      .on('data', (r) => rows.push(r))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function featurize(text) {
  const len = Math.min(1000, (text || "").length);
  const punct = (text.match(/[{}()[\]^%$#@!~*+=_<>|/\\?:;.,-]/g) || []).length / Math.max(1, len);
  const wordCount = (text.trim().split(/\s+/) || []).length;
  const avgWordLength = len / Math.max(1, wordCount);
  return [len, punct, wordCount, avgWordLength];
}

const rows = await loadCSV(path);
console.log(`Loaded ${rows.length} training samples`);

// Count distribution
const distribution = { 0: 0, 1: 0, 2: 0 };
rows.forEach(r => distribution[Number(r.label)]++);
console.log("Label distribution:", distribution);

const xs = rows.map(r => featurize(r.text));
const ys = rows.map(r => {
  const label = Number(r.label);
  // One-hot encode for 3 classes
  return [label === 0 ? 1 : 0, label === 1 ? 1 : 0, label === 2 ? 1 : 0];
});

const x = tf.tensor2d(xs);
const y = tf.tensor2d(ys);

// Three-class classification model
const model = tf.sequential();
model.add(tf.layers.dense({ units: 16, inputShape: [4], activation: "relu" }));
model.add(tf.layers.dropout({ rate: 0.3 }));
model.add(tf.layers.dense({ units: 8, activation: "relu" }));
model.add(tf.layers.dense({ units: 3, activation: "softmax" })); // 3 classes

model.compile({
  optimizer: tf.train.adam(0.001),
  loss: "categoricalCrossentropy",
  metrics: ["accuracy"]
});

console.log("Training three-tier classifier...");
await model.fit(x, y, {
  epochs: 50,
  batchSize: 32,
  validationSplit: 0.2,
  verbose: 1
});

await model.save("file://model");
console.log("Three-tier model saved to ./model");

x.dispose();
y.dispose();