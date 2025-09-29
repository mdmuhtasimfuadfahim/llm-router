import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";

let model = null;

export async function loadOrNull() {
  if (model) return model;
  if (fs.existsSync("/model/model.json")) {
    model = await tf.loadLayersModel("file://model/model.json");
  }
  return model;
}

export function heuristicComplexity(text) {
  const q = (text || "").toLowerCase();

  const hardSignals = [
    "algorithm", "big-o", "complexity", "optimization", "architecture",
    "microservices", "distributed", "blockchain", "neural network",
    "machine learning", "deep learning", "tensorflow", "pytorch",
    "kubernetes", "docker", "devops", "scalability", "performance",
    "security", "encryption", "database design", "sql optimization",
    "consensus", "byzantine", "fault tolerance", "mapreduce", "compiler",
    "garbage collector", "lambda calculus", "type inference"
  ];

  const mediumSignals = [
    "explain", "analyze", "compare", "evaluate", "reasoning", "logic",
    "step-by-step", "prove", "derive", "calculate", "solve", "debug",
    "troubleshoot", "design", "implement", "code", "programming",
    "function", "class", "api", "framework", "library", "rest api",
    "database", "sql", "javascript", "python", "react", "vue"
  ];

  const simpleSignals = [
    "what is", "who is", "when", "where", "define", "list", "name",
    "time", "weather", "hello", "hi", "thanks", "please", "height",
    "tall", "fruits"
  ];

  let hardScore = 0;
  let mediumScore = 0;
  let simpleScore = 0;

  hardSignals.forEach(signal => {
    if (q.includes(signal)) hardScore++;
  });

  mediumSignals.forEach(signal => {
    if (q.includes(signal)) mediumScore++;
  });

  simpleSignals.forEach(signal => {
    if (q.includes(signal)) simpleScore++;
  });

  const length = q.length;
  if (length > 500) hardScore += 2;
  else if (length > 200) mediumScore += 1;
  else if (length < 50 && simpleScore > 0) simpleScore += 1;

  const questionCount = (q.match(/\?/g) || []).length;
  if (questionCount > 1) mediumScore++;

  console.log(`Scores - Hard: ${hardScore}, Medium: ${mediumScore}, Simple: ${simpleScore}`);

  if (hardScore >= 1) return 2;
  if (mediumScore >= 1) return 1;
  return 0;
}

export async function classify(text) {
  const m = await loadOrNull();
  if (!m) return heuristicComplexity(text);

  const len = Math.min(1000, (text || "").length);
  const punct = (text.match(/[{}()[\]^%$#@!~*+=_<>|/\\?:;.,-]/g) || []).length / Math.max(1, len);
  const wordCount = (text.trim().split(/\s+/) || []).length;
  const avgWordLength = len / Math.max(1, wordCount);

  const x = tf.tensor2d([[len, punct, wordCount, avgWordLength]]);
  const prediction = await m.predict(x).array();
  x.dispose();

  const output = prediction[0];
  if (Array.isArray(output)) {
    const maxIndex = output.indexOf(Math.max(...output));
    return maxIndex;
  } else {
    if (output > 0.7) return 2;
    if (output > 0.3) return 1;
    return 0;
  }
}