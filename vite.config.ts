import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        // Never let the dev server hand non-code project files (Dockerfile, compose,
        // env files) to Vite's import-analysis transform. Without this, a stray
        // request for /Dockerfile is parsed as JS and crashes the page with
        // "[plugin:vite:import-analysis] ... invalid JS syntax".
        deny: ["Dockerfile", "Dockerfile.*", "docker-compose*.yml", ".env", ".env.*", "*.log"],
      },
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: true,
    },
    optimizeDeps: {
      // Constrain dependency scanning to real source files so extensionless
      // config files at the project root are never treated as entry modules.
      entries: ["src/**/*.{ts,tsx}"],
    },
  },

});
