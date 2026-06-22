import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_AI_GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const DEFAULT_AI_GATEWAY_HEADER = "Lovable-API-Key";

export function getAiGatewayApiKey() {
  const key = process.env.LOVABLE_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.API_KEY;
  if (!key) {
    throw new Error("Missing LOVABLE_API_KEY. Set it in your Docker .env or server environment.");
  }
  return key;
}

export function createAiGatewayProvider(apiKey: string) {
  const baseURL = process.env.AI_GATEWAY_BASE_URL?.trim() || DEFAULT_AI_GATEWAY_BASE_URL;
  const headerName = process.env.AI_GATEWAY_HEADER?.trim() || DEFAULT_AI_GATEWAY_HEADER;
  return createOpenAICompatible({
    name: "ai-gateway",
    baseURL,
    headers: {
      [headerName]: apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}
