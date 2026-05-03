/** @file Provides a shared helper to hydrate i18next in non-browser test environments. */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { DEFAULT_LOCALE } from "../../src/app/i18n/supported-locales";

type GlobalFetch = typeof globalThis.fetch;
type FetchInput = Parameters<GlobalFetch>[0];

const projectRoot = resolve(process.cwd());
const publicDir = resolve(projectRoot, "public");

const normaliseUrl = (input: FetchInput): string => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
};

const stripOrigin = (url: string): string => url.replace(/^https?:\/\/[^/]+/u, "");

async function readLocaleAsset(pathname: string): Promise<string> {
  const relativePath = pathname.replace(/^\//u, "");
  const diskPath = resolve(publicDir, relativePath);
  try {
    return await readFile(diskPath, "utf8");
  } catch (error) {
    const hint = `Unable to load Fluent resource for '${pathname}' at ${diskPath}`;
    if (error instanceof Error) {
      throw new Error(`${hint}: ${error.message}`, { cause: error });
    }
    throw new Error(hint);
  }
}

/** Ensures fetch requests for `/locales` are served from the file system during tests. */
const createFetchProxy = (target: typeof globalThis): GlobalFetch => {
  const fallbackFetch = target.fetch?.bind(target);

  const proxy = (async (input, init) => {
    const url = stripOrigin(normaliseUrl(input));

    if (url.startsWith("/locales/")) {
      const payload = await readLocaleAsset(url);
      const ResponseCtor = target.Response ?? Response;
      return new ResponseCtor(payload, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    if (fallbackFetch) {
      return fallbackFetch(input, init);
    }

    throw new Error(`Unhandled fetch URL during tests: ${url}`);
  }) as GlobalFetch;

  return proxy;
};

export async function setupI18nTestHarness(target: typeof globalThis = globalThis): Promise<void> {
  const patchedFetch = createFetchProxy(target);
  target.fetch = patchedFetch;

  if (typeof target.window !== "undefined" && target.window !== null) {
    target.window.fetch = patchedFetch;
  }

  const initialiseLocalStorage = (storageTarget: typeof globalThis | Window | undefined | null) => {
    if (
      storageTarget &&
      typeof storageTarget.localStorage !== "undefined" &&
      storageTarget.localStorage !== null
    ) {
      storageTarget.localStorage.setItem("i18nextLng", DEFAULT_LOCALE);
    }
  };

  initialiseLocalStorage(target);
  initialiseLocalStorage(target.window);

  const { i18nReady } = await import("../../src/i18n");
  await i18nReady;
}
