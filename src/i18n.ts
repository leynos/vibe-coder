/** @file Configures i18next with Fluent resources and browser detection. */

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Fluent from "i18next-fluent";
import FluentBackend from "i18next-fluent-backend";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_LOCALE,
  DETECTION_ORDER,
  getLocaleDirection,
  getLocaleMetadata,
  SUPPORTED_LOCALES,
} from "./app/i18n/supported-locales";
import { appLogger, reportError } from "./app/observability/logger";

const supportedLngs = SUPPORTED_LOCALES.map((locale) => locale.code);

/**
 * Normalise a raw Vite `BASE_URL` value to a consistent
 * leading-slash, trailing-slash form.
 *
 * @param rawBase - The raw base path (e.g. `import.meta.env.BASE_URL`).
 * @returns A normalised path such as `"/"`, `"/app/"`, or `"/sub-path/"`.
 *
 * @example
 * ```ts
 * normaliseBasePath(undefined)    // "/"
 * normaliseBasePath("app")        // "/app/"
 * normaliseBasePath("/game/")     // "/game/"
 * ```
 */
export const normaliseBasePath = (rawBase: string | undefined): string => {
  const candidate = rawBase && rawBase.length > 0 ? rawBase : "/";
  const withLeading = candidate.startsWith("/") ? candidate : `/${candidate}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
};

/**
 * Build the i18next Fluent backend load-path template from the configured
 * base URL.
 *
 * @param rawBase - The raw Vite `BASE_URL` value.
 * @returns A load-path template such as `"/locales/{{lng}}/{{ns}}.ftl"`.
 *
 * @example
 * ```ts
 * buildFluentLoadPath("/"); // "/locales/{{lng}}/{{ns}}.ftl"
 * buildFluentLoadPath("/app/"); // "/app/locales/{{lng}}/{{ns}}.ftl"
 * ```
 */
export const buildFluentLoadPath = (rawBase: string | undefined): string => {
  const basePath = normaliseBasePath(rawBase);
  const path = "locales/{{lng}}/{{ns}}.ftl";
  return `${basePath}${path}`;
};

type AjaxResponse = {
  status: number;
  statusText?: string;
};

interface AjaxOptions {
  body?: BodyInit | null;
  headers?: Record<string, string>;
  method?: string;
  withCredentials?: boolean;
}

// Tracks all in-flight locale fetch controllers so they can be cancelled on
// module teardown or test cleanup via abortI18nRequests().
const activeI18nControllers = new Set<AbortController>();

/**
 * Cancel all in-flight i18n locale fetch requests.
 *
 * Call this on module unload or during test teardown to prevent stale
 * callbacks from firing after the i18n module is no longer needed. Only
 * requests started by this module and tracked in `activeI18nControllers` are
 * aborted.
 *
 * @example
 * ```ts
 * void i18n.loadNamespaces(["common"]); // starts a tracked locale request
 * abortI18nRequests(); // aborts this module's tracked fetches; returns void
 * ```
 */
export function abortI18nRequests(): void {
  for (const controller of activeI18nControllers) {
    controller.abort();
  }
  activeI18nControllers.clear();
}

const fetchAjax = (
  url: string,
  options: AjaxOptions = {},
  callback: (data: string | Error, xhr: AjaxResponse) => void,
): void => {
  const { body, headers, method, withCredentials } = options;

  const controller = new AbortController();
  activeI18nControllers.add(controller);

  const request: RequestInit = {
    credentials: withCredentials ? "include" : "same-origin",
    method: method ?? "GET",
    signal: controller.signal,
  };

  if (headers) {
    request.headers = headers;
  }

  if (body != null) {
    request.body = body;
  }

  void fetch(url, request)
    .then(async (response) => {
      const { status, statusText } = response;
      if (!response.ok) {
        const errorMessage = statusText || `Request failed with status ${status}`;
        callback(new Error(errorMessage), { status, statusText: errorMessage });
        return;
      }
      const text = await response.text();
      callback(text, { status, statusText });
    })
    .catch((error) => {
      const typedError = error as Error;
      const message = typedError?.message ?? "Unexpected i18n network failure";
      const name = typedError?.name ?? "Error";

      if (name === "AbortError") {
        callback(typedError, { status: 408, statusText: message });
        return;
      }

      let status = 500;
      if (typedError instanceof TypeError || /Failed to fetch|NetworkError/u.test(message)) {
        status = 502;
      }

      const context = {
        url,
        method: request.method,
        withCredentials: Boolean(withCredentials),
        status,
        statusText: message,
      };
      appLogger.error("i18next Fluent backend fetch failed", context, typedError);
      reportError(typedError, { ...context, scope: "i18n.fetchAjax" });

      callback(typedError, { status, statusText: message });
    })
    .finally(() => {
      activeI18nControllers.delete(controller);
    });
};

/**
 * Apply a resolved BCP 47 language tag and its text direction to the HTML
 * document, setting `lang`, `dir`, and `data-direction` on both `<html>` and
 * `<body>`.
 *
 * Safe to call in non-browser environments — returns immediately when
 * `document` is undefined.
 *
 * @param language - BCP 47 language tag, e.g. `"en-GB"` or `"ar"`.
 *
 * @example
 * ```ts
 * applyDocumentLocale("en-GB");
 * // document.documentElement.lang === "en-GB"
 * // document.documentElement.dir === "ltr"
 *
 * applyDocumentLocale("ar");
 * // document.documentElement.dir === "rtl"
 * ```
 */
export const applyDocumentLocale = (language: string | undefined): void => {
  if (typeof document === "undefined") return;

  const metadata = getLocaleMetadata(language ?? DEFAULT_LOCALE);
  const resolvedLanguage = language ?? metadata.code;
  const direction = getLocaleDirection(resolvedLanguage);

  const htmlElement = document.documentElement;
  if (htmlElement) {
    htmlElement.lang = resolvedLanguage;
    htmlElement.dir = direction;
    htmlElement.setAttribute("data-direction", direction);
  }

  if (document.body) {
    document.body.lang = resolvedLanguage;
    document.body.dir = direction;
    document.body.setAttribute("data-direction", direction);
  }
};

/**
 * Promise that resolves when i18next has finished initialising and the first
 * locale bundle is available. React Suspense boundaries await this indirectly
 * via `useTranslation`; direct consumers can `await i18nReady` before
 * rendering locale-sensitive logic outside React.
 *
 * @example
 * ```ts
 * await i18nReady;
 * // i18n.hasLoadedNamespace("common") === true (given fetch succeeded)
 * ```
 *
 * The promise is created immediately so React components can rely on Suspense
 * to wait for `.ftl` bundles.
 */
export const i18nReady = i18n
  .use(FluentBackend)
  .use(LanguageDetector)
  .use(Fluent)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: buildFluentLoadPath(import.meta.env.BASE_URL as string | undefined),
      ajax: fetchAjax,
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs,
    ns: ["common"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      // Navigator is intentionally excluded to keep server renders and first visits
      // deterministic; we favour explicit query/localStorage picks plus the default locale.
      order: [...DETECTION_ORDER],
      lookupQuerystring: "lng",
      caches: ["localStorage"],
    },
    returnNull: false,
    i18nFormat: {
      fluentBundleOptions: { useIsolating: false },
    },
  });

void i18nReady.then(() => {
  applyDocumentLocale(i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE);
});

i18n.on("languageChanged", (nextLanguage) => {
  applyDocumentLocale(nextLanguage);
});

export default i18n;
