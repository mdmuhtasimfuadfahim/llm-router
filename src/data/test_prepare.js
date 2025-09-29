import fs from "fs";
import { stringify } from "csv-stringify";

const rows = [
  { text: "What time is it in New York?", label: 0 },
  { text: "Hi there", label: 0 },
  { text: "What's the weather like?", label: 0 },
  { text: "How tall is the Eiffel Tower?", label: 0 },
  { text: "Name three fruits.", label: 0 },
  { text: "Tell me about cats.", label: 0 },

  { text: "Explain how sorting algorithms work", label: 1 },
  { text: "How do I implement a REST API?", label: 1 },
  { text: "What is machine learning?", label: 1 },
  { text: "Debug this JavaScript function", label: 1 },
  { text: "Compare React and Vue.js frameworks", label: 1 },
  { text: "Analyze the performance of this database query", label: 1 },

  { text: "Implement a distributed consensus algorithm like Raft and explain Byzantine fault tolerance mechanisms", label: 2 },
  { text: "Design a microservices architecture with event sourcing, CQRS, and explain CAP theorem trade-offs in detail", label: 2 },
  { text: "Build a neural network from scratch using backpropagation and explain vanishing gradients problem with mathematical derivations", label: 2 },
  { text: "Create a compiler for a functional programming language with type inference and lambda calculus implementation", label: 2 },
  { text: "Implement MapReduce algorithm for large-scale data processing with comprehensive fault tolerance mechanisms", label: 2 },
  { text: "Design a blockchain consensus mechanism that addresses the scalability trilemma with detailed cryptographic proofs", label: 2 }
];

const output = fs.createWriteStream("data/sample.csv");
stringify(rows, { header: true }).pipe(output);
console.log("Wrote three-tier sample data in data/sample.csv");