import fs from "fs";
import { stringify } from "csv-stringify"; // Corrected import

// This script just ensures the sample dataset exists.
// In your real project, replace this with a transformer that converts Arena/ShareGPT to text,label.
const rows = [
  { text: "What time is it in New York?", label: 0 },
  { text: "Implement a distributed consensus algorithm like Raft and explain Byzantine fault tolerance.", label: 1 },
  { text: "Recommend a good pizza place nearby.", label: 0 },
  { text: "Design a microservices architecture with event sourcing, CQRS, and explain CAP theorem trade-offs.", label: 1 },
  { text: "How do I boil an egg?", label: 0 },
  { text: "Optimize this recursive Fibonacci function using dynamic programming and analyze space complexity.", label: 1 },
  { text: "What's your favorite color?", label: 0 },
  { text: "Build a neural network from scratch using backpropagation and explain vanishing gradients problem.", label: 1 },
  { text: "Tell me about cats.", label: 0 },
  { text: "Implement MapReduce algorithm for large-scale data processing with fault tolerance mechanisms.", label: 1 },
  { text: "What's the weather like?", label: 0 },
  { text: "Create a compiler for a functional programming language with type inference and lambda calculus.", label: 1 },
  { text: "How tall is the Eiffel Tower?", label: 0 },
  { text: "Design a blockchain consensus mechanism that addresses scalability trilemma.", label: 1 },
  { text: "Name three fruits.", label: 0 },
  { text: "Implement a garbage collector using generational collection and explain memory fragmentation.", label: 1 }
];

const output = fs.createWriteStream("data/sample.csv");
stringify(rows, { header: true }).pipe(output); // Adjusted usage
console.log("Wrote data in /data/sample.csv");