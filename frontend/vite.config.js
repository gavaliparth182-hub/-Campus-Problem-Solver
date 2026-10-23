import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the frontend proxies API and live-update traffic to the backend,
// so there are no CORS problems and no URLs to configure.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
      "/socket.io": { target: "http://localhost:5000", ws: true },
    },
  },
});
