import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";

let model = null;

export async function loadOrNull() {
  if (model) return model;
  if (fs.existsSync("model/model.json")) {
    model = await tf.loadLayersModel("file://model/model.json");
  }
  return model;
}

// quick heuristic as a safe fallback
export function heuristicComplexity(text) {
  const q = (text || "").toLowerCase();
  const signals = ["prove","optimize","theorem","reason","explain why","step-by-step","big-o","bug","stack trace","python","code","math","integral","derivative","sql","join","regex"];
  let score = 0;
  for (const s of signals) if (q.includes(s)) score++;
  if (q.length > 220) score++;
  return score >= 1 ? 1 : 0; // 1 = complex, 0 = simple
}

export async function classify(text) {
  const m = await loadOrNull();
  if (!m) return heuristicComplexity(text);
  // simple bag-of-chars model: length + punctuation density
  const len = Math.min(512, (text||"").length);
  const punct = (text.match(/[{}()[\]^%$#@!~*+=_<>|/\\?:;.,-]/g)||[]).length / Math.max(1,len);
  const x = tf.tensor2d([[len, punct]]);
  const y = (await m.predict(x).array())[0][0];
  x.dispose();
  return y > 0.5 ? 1 : 0;
}
