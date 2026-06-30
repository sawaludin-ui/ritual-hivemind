// @ts-check

/**
 * Simple OpenAI-compatible LLM caller.
 * Supports any provider with an OpenAI-compatible chat completions endpoint.
 */

const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL ?? "gpt-4o";
const BASE_URL = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";

/**
 * @param {string} prompt
 * @param {{ maxTokens?: number, temperature?: number }} [opts]
 * @returns {Promise<string>}
 */
export async function callLLM(prompt, opts = {}) {
  if (!API_KEY) throw new Error("LLM_API_KEY not set in .env");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${body.slice(0, 200)}`);
  }

  /** @type {any} */
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
