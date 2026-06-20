import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createAiGatewayProvider(apiKey: string) {
  const baseURL = process.env.AI_GATEWAY_BASE_URL || "https://ai.gateway.lovable.dev/v1";
  const headerName = process.env.AI_GATEWAY_HEADER || "Lovable-API-Key";
  return createOpenAICompatible({
    name: "ai-gateway",
    baseURL,
    headers: { [headerName]: apiKey },
  });
}
