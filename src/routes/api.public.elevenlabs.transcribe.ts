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

// Batch transcription with speaker diarization via ElevenLabs Scribe v2.
// Client uploads the full recorded meeting audio (multipart/form-data, field "file").
// Optional field "language" is an ISO-639-3 code ("eng", "ara"...). Omit to auto-detect.
export const Route = createFileRoute("/api/public/elevenlabs/transcribe")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return jsonResponse({
            error:
              "Speech-to-text is not configured on this server. Set ELEVENLABS_API_KEY in your server environment and restart the app.",
          }, {
            status: 500,
          });
        }

        let inbound: FormData;
        try {
          inbound = await request.formData();
        } catch {
          return jsonResponse({ error: "Invalid multipart body" }, { status: 400 });
        }

        const file = inbound.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return jsonResponse({ error: "Missing audio file" }, { status: 400 });
        }

        const language = (inbound.get("language") as string | null) || "";
        const numSpeakers = (inbound.get("num_speakers") as string | null) || "";

        const upstream = new FormData();
        upstream.append("file", file, file.name || "meeting.webm");
        upstream.append("model_id", "scribe_v2");
        upstream.append("diarize", "true");
        upstream.append("tag_audio_events", "true");
        upstream.append("timestamps_granularity", "word");
        if (language) upstream.append("language_code", language);
        if (numSpeakers) upstream.append("num_speakers", numSpeakers);

        const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": apiKey },
          body: upstream,
        });

        const text = await res.text();
        if (!res.ok) {
          return jsonResponse({ error: `ElevenLabs STT error ${res.status}: ${text}` }, { status: 502 });
        }

        return new Response(text, {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      },
    },
  },
});
