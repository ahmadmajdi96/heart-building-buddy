// Self-hosted Jitsi server used across the app.
// External API script is loaded from https://{JITSI_DOMAIN}/external_api.js
// and the JitsiMeetExternalAPI constructor also receives the same host:port.
export const JITSI_DOMAIN = "meet.cortanexai.com";
export const JITSI_EXTERNAL_API_URL = `https://${JITSI_DOMAIN}/external_api.js`;
