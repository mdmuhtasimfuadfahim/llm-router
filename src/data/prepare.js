import fs from "fs";
import { stringify } from "csv-stringify"; // Corrected import

// This script just ensures the sample dataset exists.
// In your real project, replace this with a transformer that converts Arena/ShareGPT to text,label.
const rows = [
  { text: "What's the capital of France?", label: 0 },
  { text: "Explain Big-O of quicksort and prove average-case.", label: 1 },
  { text: "Tell me a joke about databases.", label: 0 },
  { text: "Debug this Python stack trace: ValueError: shape mismatch...", label: 1 },
  { text: "Summarize today's weather in two sentences.", label: 0 },
  { text: "Write SQL to join three tables and explain why LEFT JOIN is needed.", label: 1 },
  { text: "Who won the world cup in 2018?", label: 0 },
  { text: "Derive the gradient of cross-entropy loss for softmax.", label: 1 }
];

const output = fs.createWriteStream("data/sample.csv");
stringify(rows, { header: true }).pipe(output); // Adjusted usage
console.log("Wrote data/sample.csv");