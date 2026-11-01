/**
 * @file Tests for the i18n runtime.
 *
 * Covers initialisation, locale switching, and the document-level language and
 * direction attributes that the UI relies on for right-to-left locales.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as v from "valibot";

import { DEFAULT_LOCALE } from "../src/app/i18n/supported-locales";
import i18n, { applyDocumentLocale, i18nReady } from "../src/i18n";

const readBodyDirection = (): string | undefined =>
  document.body.getAttribute("data-direction") ?? undefined;

/** Response object the Fluent backend hands to the ajax callback. */
type AjaxResponse = { readonly status: number; readonly statusText?: string };

/** Callback the Fluent backend expects after a locale request settles. */
type AjaxCallback = (data: string | Error, response: AjaxResponse) => void;

/** Request options the Fluent backend passes to the locale loader. */
type AjaxOptions = {
  readonly body?: BodyInit | null;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method?: string;
  readonly withCredentials?: boolean;
};

/** Locale loader configured on the i18next backend. */
type LocaleAjax = (url: string, options: AjaxOptions, callback: AjaxCallback) => void;

/** Schema for a value that can be invoked as the locale loader. */
const localeAjaxSchema = v.function();

/** Return true when `value` can be invoked as the locale loader. */
function isLocaleAjax(value: unknown): value is LocaleAjax {
  return v.is(localeAjaxSchema, value);
}

/** Read the ajax loader this module installed on the i18next backend. */
function readLocaleAjax(): LocaleAjax {
  const backend: object = i18n.options.backend ?? {};
  const ajax: unknown = "ajax" in backend ? backend.ajax : undefined;

  if (!isLocaleAjax(ajax)) {
    throw new Error("i18n backend does not expose an ajax loader");
  }

  return ajax;
}

describe("i18n runtime configuration", () => {
  beforeAll(async () => {
    await i18nReady;
  });

  beforeEach(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  afterEach(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it("sets document language and direction once the runtime is ready", () => {
    expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
    expect(document.documentElement.dir).toBe("ltr");
    expect(readBodyDirection()).toBe("ltr");
  });

  it("applies the resolved locale when i18next reports initialization", () => {
    document.documentElement.lang = "zz";
    document.documentElement.dir = "rtl";
    document.body.dir = "rtl";
    document.body.setAttribute("data-direction", "rtl");

    i18n.emit("initialized", i18n.options);

    expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
    expect(document.documentElement.dir).toBe("ltr");
    expect(readBodyDirection()).toBe("ltr");
  });

  it("keeps the detected language metadata when nothing has resolved", () => {
    const previousLanguage = i18n.language;
    const previousResolved = i18n.resolvedLanguage;

    try {
      // A failed bundle load leaves `resolvedLanguage` unset while i18next
      // still reports the language it attempted.
      i18n.language = "ar";
      delete i18n.resolvedLanguage;

      i18n.emit("initialized", i18n.options);

      expect(document.documentElement.lang).toBe("ar");
      expect(document.documentElement.dir).toBe("rtl");
    } finally {
      i18n.language = previousLanguage;
      if (previousResolved === undefined) {
        delete i18n.resolvedLanguage;
      } else {
        i18n.resolvedLanguage = previousResolved;
      }
    }
  });

  it("updates direction metadata when applying an RTL locale", () => {
    applyDocumentLocale("ar");

    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(readBodyDirection()).toBe("rtl");
  });

  it("updates metadata when i18next reports a language change", () => {
    i18n.emit("languageChanged", "ar");

    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(readBodyDirection()).toBe("rtl");
  });

  it("leaves metadata untouched and warns when the document has no root element", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    Object.defineProperty(document, "documentElement", {
      configurable: true,
      value: null,
    });

    try {
      expect(() => applyDocumentLocale("ar")).not.toThrow();
      expect(document.documentElement).toBeNull();

      // The fallback is invisible to users, so diagnostics must carry stable
      // fields an operator can search for.
      expect(warnSpy.mock.calls).toHaveLength(1);
      const line = warnSpy.mock.calls[0]?.[0];
      expect(line).toContain("Cannot apply document locale");
      expect(line).toContain('"operation":"i18n.applyDocumentLocale"');
      expect(line).toContain('"reason":"missing-document-element"');
      expect(line).toContain('"language":"ar"');
    } finally {
      warnSpy.mockRestore();
      Reflect.deleteProperty(document, "documentElement");
    }
  });

  it("maps an aborted locale fetch to a timeout response", async () => {
    const originalFetch = globalThis.fetch;
    // A thrown value can expose error-like `name` and `message` without being
    // an `Error`; the backend must still see `name: "AbortError"`.
    const abortCause = { name: "AbortError", message: "The operation was aborted." };
    globalThis.fetch = Object.assign(() => Promise.reject(abortCause), {
      preconnect: originalFetch.preconnect,
    });

    try {
      const ajax = readLocaleAjax();
      const outcome = await new Promise<{ data: string | Error; status: number }>((resolve) => {
        ajax("/locales/en-GB/common.ftl", {}, (data, response) => {
          resolve({ data, status: response.status });
        });
      });

      expect(outcome.status).toBe(408);
      if (!(outcome.data instanceof Error)) {
        throw new Error("expected the ajax callback to receive an Error");
      }
      expect(outcome.data.name).toBe("AbortError");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("falls back to the default locale metadata when a locale is missing", () => {
    document.documentElement.lang = "zz";
    document.documentElement.dir = "rtl";
    document.body.dir = "rtl";
    document.body.setAttribute("data-direction", "rtl");

    applyDocumentLocale();

    expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
    expect(document.documentElement.dir).toBe("ltr");
    expect(readBodyDirection()).toBe("ltr");
  });
});
