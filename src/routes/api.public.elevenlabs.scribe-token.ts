import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

export const Route = createFileRoute("/api/public/elevenlabs/scribe-token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async () => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return jsonResponse({
            error:
              "Speech-to-text is not configured on this server. Set ELEVENLABS_API_KEY in your server environment and restart the app.",
          }, {
            status: 500,
          });
        }

        const res = await fetch(
          "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
          { method: "POST", headers: { "xi-api-key": apiKey } },
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return jsonResponse({ error: `ElevenLabs token error ${res.status}: ${text}` }, { status: 502 });
        }

        const data = await res.json().catch(() => null);
        if (!data?.token) {
          return jsonResponse({ error: "ElevenLabs did not return a realtime token" }, { status: 502 });
        }

        return jsonResponse({ token: data.token });
      },
    },
  },
});
