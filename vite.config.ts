import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function normaliseBasePath(input: string | undefined): string {
  if (!input || input === "/") {
    return "/";
  }
  const prefixed = input.startsWith("/") ? input : `/${input}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

const basePath = normaliseBasePath(process.env.APP_BASE_PATH);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_OUTPUTS = [
  path.resolve(__dirname, "tokens/dist/tokens.css"),
  path.resolve(__dirname, "tokens/dist/tailwind.theme.cjs"),
];

function watchGeneratedTokens() {
  return {
    name: "watch-generated-design-tokens",
    configureServer(server) {
      for (const file of TOKEN_OUTPUTS) {
        server.watcher.add(file);
      }
    },
    handleHotUpdate(context) {
      if (TOKEN_OUTPUTS.includes(context.file)) {
        context.server.ws.send({ type: "full-reload" });
      }
    },
  };
}

export default defineConfig({
  // Allow deployments to customise the served base path (e.g., GitHub Pages).
  base: basePath,
  plugins: [tailwindcss(), react(), watchGeneratedTokens()],
});
