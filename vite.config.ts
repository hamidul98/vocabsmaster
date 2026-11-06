import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// base "./" keeps asset paths relative so the build works on GitHub Pages subpaths.
export default defineConfig({
  base: "./",
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt", // UI shows "Update available – Reload" (see hooks/usePwa.ts)
      includeAssets: ["apple-touch-icon.png", "favicon.svg"],
      manifest: {
        name: "IELTS Book Vocab",
        short_name: "Book Vocab",
        description: "Learn IELTS vocabulary from Cambridge IELTS passages.",
        display: "standalone",
        start_url: ".",
        scope: ".",
        theme_color: "#1a73f5",
        background_color: "#ffffff",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2,ttf,otf,webp}"],
        runtimeCaching: [
          {
            // Google Sheet data: show fresh when online, saved copy when offline
            urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets\/.*gviz\/tq/,
            handler: "NetworkFirst",
            options: {
              cacheName: "sheet-data",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
