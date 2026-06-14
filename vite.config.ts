/**
 * @file Vite build and development-server configuration for Vibe Coder.
 *
 * The config wires React, Tailwind, generated-token watching, deployment base
 * paths, and repository-local import aliases. Alias resolution is derived from
 * `PATH_ALIASES` in `tools/path-aliases.ts`, keeping Vite dev/build imports in
 * sync with TypeScript paths and the custom import-boundary guard.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

import { PATH_ALIASES } from "./tools/path-aliases";

/**
 * Normalize the deployment base path into Vite's slash-delimited form.
 *
 * @param input - Raw base path from the deployment environment.
 * @returns A Vite-compatible base path with leading and trailing slashes.
 *
 * @example
 * ```ts
 * normalizeBasePath("vibe-coder"); // "/vibe-coder/"
 * normalizeBasePath(undefined); // "/"
 * ```
 */
function normalizeBasePath(input: string | undefined): string {
  if (!input || input === "/") {
    return "/";
  }
  const prefixed = input.startsWith("/") ? input : `/${input}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

const basePath = normalizeBasePath(process.env.APP_BASE_PATH);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKEN_OUTPUTS = [
  path.resolve(__dirname, "tokens/dist/tokens.css"),
  path.resolve(__dirname, "tokens/dist/tailwind.theme.cjs"),
];
const resolveAliases = Object.fromEntries(
  PATH_ALIASES.map(([alias, target]) => [alias, path.resolve(__dirname, target)]),
);

/**
 * Watch generated design-token outputs and reload Vite when they change.
 *
 * @returns A Vite plugin that adds generated token files to the watcher.
 *
 * @example
 * ```ts
 * plugins: [watchGeneratedTokens()]
 * ```
 */
function watchGeneratedTokens(): Plugin {
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
  resolve: {
    alias: resolveAliases,
  },
});
