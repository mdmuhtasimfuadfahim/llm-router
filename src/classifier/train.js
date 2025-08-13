import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
import { parse } from "csv-parse";

// Expect CSV with headers: text,label   where label in {0,1} (0=simple,1=complex)
const path = process.argv[2] || "data/sample.csv";
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
  const len = Math.min(512, (text || "").length);
  const punct = (text.match(/[{}()[\]^%$#@!~*+=_<>|/\\?:;.,-]/g) || []).length / Math.max(1, len);
  return [len, punct];
}

const rows = await loadCSV(path);
const xs = rows.map(r => featurize(r.text));
const ys = rows.map(r => Number(r.label));

const x = tf.tensor2d(xs);
const y = tf.tensor2d(ys, [ys.length, 1]);

const model = tf.sequential();
model.add(tf.layers.dense({ units: 8, inputShape: [2], activation: "relu" }));
model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
model.compile({ optimizer: tf.train.adam(0.01), loss: "binaryCrossentropy", metrics: ["accuracy"] });

await model.fit(x, y, { epochs: 30, batchSize: 32, validationSplit: 0.2, verbose: 1 });

await model.save("file://model");
console.log("Model saved to ./model");

x.dispose(); y.dispose();
