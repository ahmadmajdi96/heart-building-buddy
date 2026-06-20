import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  server: {
    allowedHosts: ["arab.law.cortanexai.com"],
  },
} as any);
