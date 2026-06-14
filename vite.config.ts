import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
  },
  server: {
    host: true,
    // Dedicated port so Pale Thirst never collides with other local dev servers.
    port: 5180,
    strictPort: true,
  },
});
