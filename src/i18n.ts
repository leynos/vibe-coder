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

export const normaliseBasePath = (rawBase: string | undefined): string => {
  const candidate = rawBase && rawBase.length > 0 ? rawBase : "/";
  const withLeading = candidate.startsWith("/") ? candidate : `/${candidate}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
};

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

const fetchAjax = (
  url: string,
  options: AjaxOptions = {},
  callback: (data: string | Error, xhr: AjaxResponse) => void,
): void => {
  const { body, headers, method, withCredentials } = options;

  const request: RequestInit = {
    credentials: withCredentials ? "include" : "same-origin",
    method: method ?? "GET",
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

      let status = 500;
      if (name === "AbortError") {
        status = 408;
      } else if (typedError instanceof TypeError || /Failed to fetch|NetworkError/u.test(message)) {
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
    });
};

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
    document.body.dir = direction;
    document.body.setAttribute("data-direction", direction);
  }
};

// Initialise immediately so that React components can rely on Suspense to wait for .ftl bundles.
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
