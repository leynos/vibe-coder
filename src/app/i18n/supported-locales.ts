/** @file Shared locale metadata consumed by the i18n runtime and UI controls. */

/**
 * Text direction used for document and control layout metadata.
 */
export type TextDirection = "ltr" | "rtl";

/**
 * Locale metadata displayed in selectors and passed to i18next.
 */
export type SupportedLocale = {
  /** BCP-47 code used by i18next and Fluent when loading .ftl bundles. */
  code: string;
  /** Human-friendly label surfaced in selectors; include region when helpful. */
  label: string;
  /** Native spellings improve recognition when the UI is not yet translated. */
  nativeLabel: string;
  /** Optional text direction override when the language is RTL. */
  direction?: TextDirection;
};

const dedupeSupportedLocales = (
  locales: readonly SupportedLocale[],
): Readonly<[SupportedLocale, ...SupportedLocale[]]> => {
  const seen = new Set<string>();
  const deduped = locales.filter((locale) => {
    const key = locale.code.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  if (deduped.length === 0) {
    throw new Error("SUPPORTED_LOCALES must include at least one locale");
  }

  return deduped as unknown as Readonly<[SupportedLocale, ...SupportedLocale[]]>;
};

const RAW_SUPPORTED_LOCALES = [
  { code: "en-GB", label: "English (UK)", nativeLabel: "English (UK)" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", direction: "rtl" },
  { code: "cy", label: "Welsh", nativeLabel: "Cymraeg" },
  { code: "da", label: "Danish", nativeLabel: "Dansk" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "el", label: "Greek", nativeLabel: "Ελληνικά" },
  { code: "en-GB", label: "English (UK)", nativeLabel: "English (UK)" },
  { code: "en-US", label: "English (US)", nativeLabel: "English (US)" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fi", label: "Finnish", nativeLabel: "Suomi" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "gd", label: "Scots Gaelic", nativeLabel: "Gàidhlig" },
  { code: "he", label: "Hebrew", nativeLabel: "עברית", direction: "rtl" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "nb", label: "Norwegian", nativeLabel: "Norsk Bokmål" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { code: "pl", label: "Polish", nativeLabel: "Polski" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "sv", label: "Swedish", nativeLabel: "Svenska" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "th", label: "Thai", nativeLabel: "ไทย" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { code: "zh-CN", label: "Chinese (Simplified)", nativeLabel: "简体中文" },
  { code: "zh-TW", label: "Chinese (Traditional)", nativeLabel: "繁體中文" },
] as const satisfies readonly SupportedLocale[];

/**
 * Deduplicated, non-empty list of locales supported by the application.
 */
export const SUPPORTED_LOCALES = dedupeSupportedLocales(RAW_SUPPORTED_LOCALES);

/**
 * Default locale used when detection yields no supported language.
 */
export const DEFAULT_LOCALE = SUPPORTED_LOCALES[0].code;

/**
 * Ordered i18next detector sources used by the browser runtime.
 */
export const DETECTION_ORDER = ["querystring", "localStorage"] as const;

const LOCALE_MAP: Record<string, SupportedLocale> = SUPPORTED_LOCALES.reduce(
  (map, locale) => {
    const fullCode = locale.code.toLowerCase();
    map[fullCode] = locale;
    const [languagePart] = fullCode.split("-");
    const languageKey = languagePart ?? fullCode;
    if (!map[languageKey]) {
      map[languageKey] = locale;
    }
    return map;
  },
  {} as Record<string, SupportedLocale>,
);

const defaultLocaleMetadata = (() => {
  const locale = LOCALE_MAP[DEFAULT_LOCALE.toLowerCase()];
  if (!locale) {
    throw new Error(`DEFAULT_LOCALE '${DEFAULT_LOCALE}' is not present in SUPPORTED_LOCALES`);
  }
  return locale;
})();

/**
 * Return metadata for a locale code, falling back to language-only and default matches.
 *
 * @param code - Optional BCP-47 locale code to look up.
 * @returns Supported locale metadata for the best available match.
 */
export const getLocaleMetadata = (code: string | undefined): SupportedLocale => {
  if (!code) {
    return defaultLocaleMetadata;
  }

  const lookupKey = code.toLowerCase();
  const [languagePart] = lookupKey.split("-");
  return (
    LOCALE_MAP[lookupKey] ??
    (languagePart ? LOCALE_MAP[languagePart] : undefined) ??
    defaultLocaleMetadata
  );
};

/**
 * Return the text direction for a locale code.
 *
 * @param code - Optional BCP-47 locale code to inspect.
 * @returns The locale direction, defaulting to left-to-right.
 */
export const getLocaleDirection = (code: string | undefined): TextDirection => {
  return getLocaleMetadata(code).direction ?? "ltr";
};

/**
 * Check whether a locale should be rendered right-to-left.
 *
 * @param code - Optional BCP-47 locale code to inspect.
 * @returns True when the resolved locale direction is right-to-left.
 */
export const isRtlLocale = (code: string | undefined): boolean => {
  return getLocaleDirection(code) === "rtl";
};
