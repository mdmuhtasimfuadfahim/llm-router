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

// Enhanced heuristic for three-tier classification
export function heuristicComplexity(text) {
  const q = (text || "").toLowerCase();

  // Technical/programming signals (high complexity)
  const hardSignals = [
    "algorithm", "big-o", "complexity", "optimization", "architecture",
    "microservices", "distributed", "blockchain", "neural network",
    "machine learning", "deep learning", "tensorflow", "pytorch",
    "kubernetes", "docker", "devops", "scalability", "performance",
    "security", "encryption", "database design", "sql optimization"
  ];

  // Reasoning/analytical signals (medium complexity)  
  const mediumSignals = [
    "explain", "analyze", "compare", "evaluate", "reasoning", "logic",
    "step-by-step", "prove", "derive", "calculate", "solve", "debug",
    "troubleshoot", "design", "implement", "code", "programming",
    "function", "class", "api", "framework", "library"
  ];

  // Simple/factual signals (low complexity)
  const simpleSignals = [
    "what is", "who is", "when", "where", "define", "list", "name",
    "time", "weather", "hello", "hi", "thanks", "please"
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

  // Length-based adjustment
  const length = q.length;
  if (length > 500) hardScore++;
  else if (length > 200) mediumScore++;
  else if (length < 50) simpleScore++;

  // Multiple questions or complex punctuation
  const questionCount = (q.match(/\?/g) || []).length;
  const complexPunct = (q.match(/[{}()[\]^%$#@!~*+=_<>|/\\:;]/g) || []).length;

  if (questionCount > 1 || complexPunct > 5) mediumScore++;

  // Decision logic
  if (hardScore >= 1) return 2; // Hard
  if (mediumScore >= 1 || (length > 100 && simpleScore === 0)) return 1; // Medium
  return 0; // Simple
}

export async function classify(text) {
  const m = await loadOrNull();
  if (!m) return heuristicComplexity(text);

  // Enhanced feature extraction for three-tier classification
  const len = Math.min(1000, (text || "").length);
  const punct = (text.match(/[{}()[\]^%$#@!~*+=_<>|/\\?:;.,-]/g) || []).length / Math.max(1, len);
  const wordCount = (text.trim().split(/\s+/) || []).length;
  const avgWordLength = len / Math.max(1, wordCount);

  const x = tf.tensor2d([[len, punct, wordCount, avgWordLength]]);
  const prediction = await m.predict(x).array();
  x.dispose();

  // Convert model output to three-tier classification
  const output = prediction[0];
  if (Array.isArray(output)) {
    // Multi-class output
    const maxIndex = output.indexOf(Math.max(...output));
    return maxIndex;
  } else {
    // Binary output - convert to three-tier
    if (output > 0.7) return 2;
    if (output > 0.3) return 1;
    return 0;
  }
}