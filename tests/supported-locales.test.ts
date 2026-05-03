import { describe, expect, it } from "bun:test";

import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  getLocaleMetadata,
  isRtlLocale,
  SUPPORTED_LOCALES,
} from "../src/app/i18n/supported-locales";

describe("supported locale metadata", () => {
  it("exposes a default locale present in the supported list", () => {
    expect(DEFAULT_LOCALE).toBe(SUPPORTED_LOCALES[0].code);
  });

  it("returns the default locale metadata when no code is provided", () => {
    const metadata = getLocaleMetadata(undefined);

    expect(metadata.code).toBe(DEFAULT_LOCALE);
    expect(metadata.label).toBe(SUPPORTED_LOCALES[0].label);
  });

  it("matches locales in a case-insensitive manner", () => {
    expect(getLocaleMetadata("ES").code).toBe("es");
  });

  it("falls back to language-only matches when the region is unsupported", () => {
    expect(getLocaleMetadata("fr-CA").code).toBe("fr");
  });

  it("returns the default locale when no match can be made", () => {
    expect(getLocaleMetadata("xx").code).toBe(DEFAULT_LOCALE);
  });

  it("does not expose duplicate locale codes", () => {
    const codes = SUPPORTED_LOCALES.map((locale) => locale.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("locale direction helpers", () => {
  it("surfaces RTL direction metadata when languages require it", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(isRtlLocale("he")).toBe(true);
  });

  it("defaults to ltr when a locale is undefined or unsupported", () => {
    expect(getLocaleDirection(undefined)).toBe("ltr");
    expect(isRtlLocale("xx")).toBe(false);
  });
});
