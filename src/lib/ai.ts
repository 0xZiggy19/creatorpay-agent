import "server-only";
import { createGateway, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Picks the LLM based on whichever key is present:
 *  1. AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN on Vercel) -> Vercel AI Gateway, model AI_MODEL (default openai/gpt-5.4-mini)
 *  2. OPENAI_API_KEY -> OpenAI directly (optionally OPENAI_BASE_URL for any OpenAI-compatible API)
 *  3. nothing -> null (the app falls back to a deterministic rule-based parser so the demo still runs)
 */
export function getModel(): { model: LanguageModel; provider: string; modelId: string } | null {
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
