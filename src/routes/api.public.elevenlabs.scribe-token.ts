import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/elevenlabs/scribe-token")({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "ElevenLabs not connected" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const res = await fetch(
          "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
          { method: "POST", headers: { "xi-api-key": apiKey } },
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: `ElevenLabs token error: ${res.status} ${text}` }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }

        const data = await res.json();
        return new Response(JSON.stringify({ token: data.token }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
