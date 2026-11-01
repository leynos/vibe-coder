/** @file Playwright configuration for e2e tests. */

import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { URL } from "node:url";

import { defineConfig, devices } from "@playwright/test";
import * as v from "valibot";

process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

/**
 * Return the effective port for a URL, defaulting by protocol.
 *
 * @param url - Parsed base URL, with or without an explicit port.
 * @returns The explicit port, or 443 for HTTPS and 80 otherwise.
 *
 * @example
 * ```ts
 * resolvePort(new URL("https://example.test")); // 443
 * resolvePort(new URL("http://localhost:4321")); // 4321
 * ```
 */
export function resolvePort(url: URL): number {
  if (url.port !== "") {
    return Math.trunc(Number(url.port));
  }
  return url.protocol === "https:" ? 443 : 80;
}

const basePort = resolvePort(new URL(baseURL));

/** Shape of the OS-provided listening address; other address kinds are rejected. */
const AddressInfoSchema = v.object({ port: v.number() });

/**
 * Report whether something already accepts connections at `target`.
 *
 * Used to decide whether Playwright should spawn the dev server. The probe
 * runs in a child process so a hung connection cannot block configuration
 * evaluation, and it waits at most 500 ms. `PLAYWRIGHT_SKIP_WEBSERVER=1`
 * short-circuits to `true`, which lets CI reuse a server started elsewhere.
 *
 * @param target - Absolute URL, typically the configured base URL.
 * @returns `true` when the port accepts a TCP connection, or when the web
 * server is explicitly skipped.
 *
 * @example
 * ```ts
 * serverIsReachable("http://127.0.0.1:5173"); // true when Vite is running
 * ```
 */
function serverIsReachable(target: string): boolean {
  if (process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1") {
    return true;
  }
  try {
    const url = new URL(target);
    const port = resolvePort(url);
    const hostArg = JSON.stringify(url.hostname);
    const portArg = JSON.stringify(port);
    const script = `
const net = require("node:net");
const socket = net.createConnection({ host: ${hostArg}, port: ${portArg} });
socket.on("connect", () => { socket.destroy(); process.exit(0); });
socket.on("error", () => { socket.destroy(); process.exit(1); });
setTimeout(() => { socket.destroy(); process.exit(1); }, 500);
`;
    const result = spawnSync(process.execPath, ["-e", script], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

const shouldLaunchWebServer = !serverIsReachable(baseURL);

/**
 * Bind `preferred`, falling back to an ephemeral port when it is taken.
 *
 * The preferred port usually comes from the base URL, so honouring it keeps
 * the launched server at the URL the tests expect. Another checkout may
 * already hold it, though, and failing configuration outright would make the
 * e2e suite unusable on a shared machine; falling back keeps the run going
 * because the resolved port is written back into the base URL.
 *
 * @param preferred - Port to try first.
 * @returns The bound port, with the probe socket already closed.
 *
 * @example
 * ```ts
 * const port = await findAvailablePort(5173); // 5173, or a free port if taken
 * ```
 */
async function findAvailablePort(preferred: number): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const attempt = createServer();

    /** Close `server` and resolve with the port the OS actually bound. */
    const resolveWithPortAndClose = (server: ReturnType<typeof createServer>) => {
      const parsedAddress = v.safeParse(AddressInfoSchema, server.address());
      if (!parsedAddress.success) {
        server.close(() => reject(new Error("Unable to determine listening port")));
        return;
      }
      server.close(() => resolve(parsedAddress.output.port));
    };

    /** Retry the bind on an OS-assigned port after `preferred` was refused. */
    const startFallback = () => {
      attempt.close(() => {
        const fallback = createServer();
        /** Drop both one-shot listeners so the losing branch cannot fire. */
        const cleanupFallback = () => {
          fallback.removeAllListeners("error");
          fallback.removeAllListeners("listening");
        };
        fallback.once("error", (err) => {
          cleanupFallback();
          fallback.close(() => reject(err));
        });
        fallback.once("listening", () => {
          cleanupFallback();
          resolveWithPortAndClose(fallback);
        });
        fallback.listen(0);
      });
    };

    attempt.once("error", () => {
      attempt.removeAllListeners("listening");
      startFallback();
    });

    attempt.once("listening", () => {
      attempt.removeAllListeners("error");
      resolveWithPortAndClose(attempt);
    });

    attempt.listen(preferred);
  });
}

const resolvedPort = shouldLaunchWebServer ? await findAvailablePort(basePort) : basePort;
const resolvedBase = new URL(baseURL);
resolvedBase.port = String(resolvedPort);
const resolvedBaseURL = resolvedBase.toString();

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.pw.ts"],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: resolvedBaseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: shouldLaunchWebServer
    ? {
        command: `bun run dev -- --host --port ${resolvedPort}`,
        url: resolvedBaseURL,
        reuseExistingServer: true,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000,
      }
    : undefined,
});
