import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const extraAllowedHosts = (
  process.env.APP_DOMAIN ??
  process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS ??
  ""
)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const allowedHosts = ["localhost", "127.0.0.1", ...extraAllowedHosts];

export default defineConfig({
  nitro: {
    preset: "node-server",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts,
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts,
  },
} as any);
