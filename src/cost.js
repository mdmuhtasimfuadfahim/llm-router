import { encoding_for_model } from "@dqbd/tiktoken";
// dynamic import fallback because optional
let encoder = null;
export async function tokenCount(model, text) {
  try {
    if (!encoder) encoder = encoding_for_model("gpt-3.5-turbo");
    return encoder.encode(text || "").length;
  } catch {
    // fallback rough estimate: 4 chars/token
    return Math.ceil((text||"").length / 4);
  }
}

export async function estimateCostUSD(model, prompt, answer) {
  const prices = JSON.parse(process.env.PRICES_JSON || "{}");
  const p = prices[model] || {in:0.0, out:0.0};
  const inTok = await tokenCount(model, prompt);
  const outTok = await tokenCount(model, answer);
  return (inTok/1000)*p.in + (outTok/1000)*p.out;
}
