import { afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";

import { DEFAULT_LOCALE } from "../src/app/i18n/supported-locales";
import i18n, { applyDocumentLocale, i18nReady } from "../src/i18n";

const readBodyDirection = () =>
  (document.body.dataset as DOMStringMap & { direction?: string }).direction ?? undefined;

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

  it("updates direction metadata when applying an RTL locale", () => {
    applyDocumentLocale("ar");

    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(readBodyDirection()).toBe("rtl");
  });

  it("falls back to the default locale metadata when a locale is missing", () => {
    document.documentElement.lang = "zz";
    document.documentElement.dir = "rtl";
    document.body.dir = "rtl";
    const bodyDataset = document.body.dataset as DOMStringMap & { direction?: string };
    bodyDataset.direction = "rtl";

    applyDocumentLocale(undefined);

    expect(document.documentElement.lang).toBe(DEFAULT_LOCALE);
    expect(document.documentElement.dir).toBe("ltr");
    expect(readBodyDirection()).toBe("ltr");
  });
});
