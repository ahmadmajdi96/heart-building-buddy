import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Novita AI (OpenAI-compatible) is the default provider.
const DEFAULT_AI_GATEWAY_BASE_URL = "https://api.novita.ai/v3/openai";
export const DEFAULT_AI_MODEL =
  process.env.AI_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct";

export function getAiGatewayApiKey() {
  const key =
    process.env.NOVITA_API_KEY ||
    process.env.AI_GATEWAY_API_KEY ||
    process.env.LOVABLE_API_KEY ||
    process.env.API_KEY;
  if (!key) {
    throw new Error(
      "Missing NOVITA_API_KEY. Set it in your Docker .env or server environment.",
    );
  }
  return key;
}

export function createAiGatewayProvider(apiKey: string) {
  const baseURL =
    process.env.AI_GATEWAY_BASE_URL?.trim() || DEFAULT_AI_GATEWAY_BASE_URL;
  return createOpenAICompatible({
    name: "novita",
    baseURL,
    apiKey,
  });
}
