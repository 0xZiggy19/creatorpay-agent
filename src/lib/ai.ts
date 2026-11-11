import "server-only";
import { createGateway, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogle } from "@ai-sdk/google";

/**
 * Picks the LLM based on whichever key is present:
 *  0. GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) -> Google Gemini directly, model GEMINI_MODEL (default gemini-3.5-flash)
 *  1. AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN on Vercel) -> Vercel AI Gateway, model AI_MODEL (default openai/gpt-5.4-mini)
 *  2. OPENAI_API_KEY -> OpenAI directly (optionally OPENAI_BASE_URL for any OpenAI-compatible API)
 *  3. nothing -> null (the app falls back to a deterministic rule-based parser so the demo still runs)
 */
type ModelChoice = { model: LanguageModel; provider: string; modelId: string };

/**
 * Ordered list of models to try. For Gemini we chain several flash models because each has its own
 * (free-tier) rate limit; if one is rate-limited or overloaded the agent moves on to the next.
 * Override with GEMINI_MODEL (comma-separated list allowed).
 */
export function getModelChain(): ModelChoice[] {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    const google = createGoogle({ apiKey: geminiKey });
    const ids = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite,gemini-3.5-flash,gemini-flash-latest")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return ids.map((modelId) => ({ model: google(modelId), provider: "Google Gemini", modelId }));
  }
  const m = getModel();
  return m ? [m] : [];
}

export function getModel(): { model: LanguageModel; provider: string; modelId: string } | null {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) return getModelChain()[0];
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    const modelId = process.env.AI_MODEL || "openai/gpt-5.4-mini";
    const gw = createGateway(process.env.AI_GATEWAY_API_KEY ? { apiKey: process.env.AI_GATEWAY_API_KEY } : {});
    return { model: gw(modelId), provider: "Vercel AI Gateway", modelId };
  }
  if (process.env.OPENAI_API_KEY) {
    const modelId = process.env.AI_MODEL || "gpt-5.4-mini";
    const baseURL = process.env.OPENAI_BASE_URL;
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY, ...(baseURL ? { baseURL } : {}) });
    return { model: baseURL ? openai.chat(modelId) : openai(modelId), provider: baseURL ? "OpenAI-compatible" : "OpenAI", modelId };
  }
  return null;
}
