/** @file Provides a shared helper to hydrate i18next in non-browser test environments. */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_LOCALE } from "../../src/app/i18n/supported-locales";

type GlobalFetch = typeof globalThis.fetch;
type FetchInput = Parameters<GlobalFetch>[0];

const projectRoot = path.resolve(process.cwd());
const publicDir = path.resolve(projectRoot, "public");

const normaliseUrl = (input: FetchInput): string => {
  if (input instanceof URL) {
    return input.toString();
  }

  if (input instanceof Request) {
    return input.url;
  }

  return input;
};

const stripOrigin = (url: string): string => url.replace(/^https?:\/\/[^/]+/u, "");

async function readLocaleAsset(pathname: string): Promise<string> {
  const relativePath = pathname.replace(/^\//u, "");
  const diskPath = path.resolve(publicDir, relativePath);
  try {
    return await readFile(diskPath, "utf8");
  } catch (error) {
    const hint = `Unable to load Fluent resource for '${pathname}' at ${diskPath}`;
    if (error instanceof Error) {
      throw new TypeError(`${hint}: ${error.message}`, { cause: error });
    }
    throw new TypeError(hint);
  }
}

/** Ensures fetch requests for `/locales` are served from the file system during tests. */
const createFetchProxy = (target: typeof globalThis): GlobalFetch => {
  const fallbackFetch = target.fetch.bind(target);

  const proxy = async (input: FetchInput, init?: BunFetchRequestInit): Promise<Response> => {
    const url = stripOrigin(normaliseUrl(input));

    if (url.startsWith("/locales/")) {
      const payload = await readLocaleAsset(url);
      const ResponseCtor = target.Response;
      return new ResponseCtor(payload, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return fallbackFetch(input, init);
  };

  // Preserve Bun's `fetch.preconnect` extension so the proxy keeps the full
  // `typeof fetch` contract.
  return Object.assign(proxy, { preconnect: target.fetch.preconnect });
};

/**
 * Prepare i18n for tests by serving locale assets through a fetch proxy.
 *
 * @param target - Global-like object whose fetch and storage should be patched.
 * @returns A promise that resolves once i18next has loaded the default locale.
 */
const initialiseLocalStorage = (storageTarget: typeof globalThis | Window): void => {
  if ("localStorage" in storageTarget) {
    storageTarget.localStorage.setItem("i18nextLng", DEFAULT_LOCALE);
  }
};

export async function setupI18nTestHarness(target: typeof globalThis = globalThis): Promise<void> {
  const patchedFetch = createFetchProxy(target);
  target.fetch = patchedFetch;

  if ("window" in target) {
    target.window.fetch = patchedFetch;
    initialiseLocalStorage(target.window);
  }

  initialiseLocalStorage(target);

  const { i18nReady } = await import("../../src/i18n");
  await i18nReady;
}
