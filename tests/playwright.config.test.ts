/**
 * @file Contract tests for the Playwright configuration's URL handling.
 *
 * Evaluates the configuration in child processes so each test observes a
 * clean environment. The web server probe is skipped, which keeps the tests
 * focused on port and base-URL resolution rather than on process management.
 */

import { describe, expect, it } from "bun:test";
import { createServer } from "node:net";
import path from "node:path";
import * as v from "valibot";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const CONFIG_URL = path.join(REPO_ROOT, "playwright.config.ts");

/** Environment flag that tells the config to reuse a server started elsewhere. */
const SKIP_WEBSERVER_ENV = "PLAYWRIGHT_SKIP_WEBSERVER";

const READ_CONFIG_SCRIPT = `
const { resolvePort } = await import(${JSON.stringify(CONFIG_URL)});
const config = (await import(${JSON.stringify(CONFIG_URL)})).default;
console.log(JSON.stringify({
  baseURL: config.use.baseURL,
  webServer: config.webServer
    ? { command: config.webServer.command, url: config.webServer.url }
    : null,
  ports: {
    explicit: resolvePort(new URL("http://127.0.0.1:8080")),
    httpDefault: resolvePort(new URL("http://example.test")),
    httpsDefault: resolvePort(new URL("https://example.test")),
    httpsExplicit: resolvePort(new URL("https://example.test:8443")),
  },
}));
`;

const AddressSchema = v.object({ port: v.number() });

type ConfigSnapshot = {
  baseURL: string;
  webServer: { command: string; url: string } | null;
  ports: {
    explicit: number;
    httpDefault: number;
    httpsDefault: number;
    httpsExplicit: number;
  };
};

type ReadConfigOptions = {
  baseURL?: string;
  skipWebServer?: boolean;
};

/** Evaluate the configuration in a child process with the requested environment. */
function readConfig({ baseURL, skipWebServer = true }: ReadConfigOptions = {}): ConfigSnapshot {
  // Start from a copy without any inherited base URL or skip flag so the
  // requested case drives the configuration rather than the parent process.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => key !== "PLAYWRIGHT_BASE_URL" && key !== "PLAYWRIGHT_SKIP_WEBSERVER",
    ),
  );
  if (skipWebServer) {
    Object.assign(env, { PLAYWRIGHT_SKIP_WEBSERVER: "1" });
  }
  if (baseURL !== undefined) {
    Object.assign(env, { PLAYWRIGHT_BASE_URL: baseURL });
  }

  const result = Bun.spawnSync([process.execPath, "-e", READ_CONFIG_SCRIPT], {
    cwd: REPO_ROOT,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(`Playwright config evaluation failed: ${result.stderr.toString()}`);
  }

  // SAFETY: the child script serialises the snapshot it builds from this
  // repository's own Playwright config; the assertions below fail if the
  // shape or values drift.
  return JSON.parse(result.stdout.toString()) as ConfigSnapshot;
}

/** Start a server and resolve once it is listening. */
function listenOn(server: ReturnType<typeof createServer>, host: string, port: number) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host, port }, resolve);
  });
}

/** Close a server and resolve once its handle is released. */
function close(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

/** Return a free loopback port that the caller can reuse immediately. */
async function reserveFreePort(): Promise<number> {
  const probe = createServer();
  await listenOn(probe, "127.0.0.1", 0);
  const { port } = v.parse(AddressSchema, probe.address());
  await close(probe);
  return port;
}

describe("Playwright base URL resolution", () => {
  it("uses the local development default when no base URL is configured", () => {
    const config = readConfig();

    expect(config.baseURL).toBe("http://localhost:5173/");
    expect(config.webServer).toBeNull();
  });

  it("preserves an explicit base URL and its port", () => {
    const config = readConfig({ baseURL: "http://127.0.0.1:4321/app/" });

    expect(config.baseURL).toBe("http://127.0.0.1:4321/app/");
  });
});

describe("Playwright web server launch", () => {
  it("launches the dev server on an available configured port", async () => {
    const port = await reserveFreePort();

    const config = readConfig({
      baseURL: `http://127.0.0.1:${port}`,
      skipWebServer: false,
    });

    expect(config.baseURL).toBe(`http://127.0.0.1:${port}/`);
    expect(config.webServer?.command).toContain(`--port ${port}`);
    expect(config.webServer?.url).toBe(config.baseURL);
  });

  it("ignores an inherited skip flag when the caller asks for the web server", async () => {
    const port = await reserveFreePort();
    const previous = process.env[SKIP_WEBSERVER_ENV];
    process.env[SKIP_WEBSERVER_ENV] = "1";

    try {
      const config = readConfig({
        baseURL: `http://127.0.0.1:${port}`,
        skipWebServer: false,
      });

      expect(config.webServer?.command).toContain(`--port ${port}`);
      expect(config.webServer?.url).toBe(config.baseURL);
    } finally {
      if (previous === undefined) {
        Reflect.deleteProperty(process.env, SKIP_WEBSERVER_ENV);
      } else {
        process.env[SKIP_WEBSERVER_ENV] = previous;
      }
    }
  });

  it("falls back to an ephemeral port when the preferred port cannot be bound", async () => {
    // Two addresses are needed, because the configuration probes before it
    // binds. The occupier listens on 127.0.0.1, where it holds the port against
    // the configuration's wildcard bind and so forces the fallback branch. The
    // probe targets 127.0.0.2, where nothing listens, so it reports the port as
    // closed and the configuration reaches that bind. 127.0.0.2 is only
    // dialled, never bound, so it needs no configured alias and the fixture
    // works on hosts that configure just 127.0.0.1 or that disable IPv6.
    const occupier = createServer();
    await listenOn(occupier, "127.0.0.1", 0);
    const { port: preferred } = v.parse(AddressSchema, occupier.address());

    try {
      const config = readConfig({
        baseURL: `http://127.0.0.2:${preferred}`,
        skipWebServer: false,
      });
      const resolved = Number(new URL(config.baseURL).port);

      expect(resolved).toBeGreaterThan(0);
      expect(resolved).not.toBe(preferred);
      expect(config.webServer?.command).toContain(`--port ${resolved}`);
    } finally {
      await close(occupier);
    }
  });
});

describe("Playwright port resolution", () => {
  it("prefers an explicit port over the protocol default", () => {
    const { ports } = readConfig();

    expect(ports.explicit).toBe(8080);
    expect(ports.httpsExplicit).toBe(8443);
  });

  it("falls back to the protocol default when the URL omits a port", () => {
    const { ports } = readConfig();

    expect(ports.httpDefault).toBe(80);
    expect(ports.httpsDefault).toBe(443);
  });
});
