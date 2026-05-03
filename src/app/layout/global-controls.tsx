/** @file Floating global controls for theme, display mode, and language toggles. */

import { type ChangeEvent, type JSX, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../i18n/supported-locales";
import { appLogger, reportError } from "../observability/logger";
import { useDisplayMode } from "../providers/display-mode-provider";
import { useTheme } from "../providers/theme-provider";

const baseButtonClass =
  "btn btn-xs md:btn-sm btn-ghost bg-base-100/90 text-xs font-semibold shadow-lg shadow-base-300/40 backdrop-blur";
const selectClass =
  "select select-xs md:select-sm select-bordered bg-base-100/90 text-xs font-semibold shadow-lg shadow-base-300/40 backdrop-blur w-full";

function LanguageSelect(): JSX.Element {
  const { i18n, t } = useTranslation();
  const [language, setLanguage] = useState(
    () => i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE,
  );
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const handleLanguageChanged = (nextLanguage: string): void => {
      setLanguage(nextLanguage);
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  const onLanguageChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextLanguage = event.target.value;
    if (nextLanguage === language || isSwitching) {
      return;
    }

    const previousLanguage = language;
    setIsSwitching(true);
    setLanguage(nextLanguage);

    i18n
      .changeLanguage(nextLanguage)
      .catch((error: unknown) => {
        const context = { nextLanguage, previousLanguage };
        appLogger.error("Failed to change language", context, error);
        reportError(error, { ...context, scope: "global-controls.language-change" });
        setLanguage(previousLanguage);
      })
      .finally(() => {
        setIsSwitching(false);
      });
  };

  const label = t("controls-language-label", { defaultValue: "Language" });

  return (
    <label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-base-content/60">
      <span>{label}</span>
      <select
        className={selectClass}
        value={language}
        aria-label={label}
        aria-busy={isSwitching}
        disabled={isSwitching}
        onChange={onLanguageChange}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ThemeToggleButton(): JSX.Element {
  const { theme, themes, setTheme } = useTheme();
  const { t } = useTranslation();
  const nextTheme = themes.find((entry) => entry !== theme) ?? theme;
  const label =
    nextTheme === "vibe-coder-day"
      ? t("controls-theme-toggle-day-label", { defaultValue: "Switch to Day" })
      : t("controls-theme-toggle-night-label", { defaultValue: "Switch to Night" });

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={baseButtonClass}
      aria-label={label}
    >
      {label}
    </button>
  );
}

function DisplayModeToggleButton(): JSX.Element {
  const { isHosted, setHosted, setFullBrowser } = useDisplayMode();
  const { t } = useTranslation();
  const label = isHosted
    ? t("controls-display-toggle-full-label", { defaultValue: "Switch to Full View" })
    : t("controls-display-toggle-hosted-label", { defaultValue: "Switch to Hosted Frame" });

  return (
    <button
      type="button"
      onClick={() => (isHosted ? setFullBrowser() : setHosted())}
      className={baseButtonClass}
      aria-label={label}
    >
      {label}
    </button>
  );
}

function DrawerPanel({
  headingId,
  onClose,
}: {
  headingId: string;
  onClose: () => void;
}): JSX.Element {
  const { hasUserPreference, resetToSystemDefault } = useDisplayMode();
  const { t } = useTranslation();
  const heading = t("controls-drawer-heading", { defaultValue: "Display & theme" });
  const closeLabel = t("controls-drawer-close-label", { defaultValue: "Close display controls" });
  const closeButton = t("controls-drawer-close-button", { defaultValue: "Close" });
  const resetLabel = t("controls-reset-to-device-default-label", {
    defaultValue: "Reset to device default",
  });

  return (
    <div className="global-controls__panel">
      <div className="flex items-center justify-between">
        <h2 id={headingId} className="text-sm font-semibold text-base-content">
          {heading}
        </h2>
        <button
          type="button"
          className="btn btn-ghost btn-xs text-xs"
          onClick={onClose}
          aria-label={closeLabel}
        >
          {closeButton}
        </button>
      </div>
      <DisplayModeToggleButton />
      <ThemeToggleButton />
      <LanguageSelect />
      <button
        type="button"
        className="btn btn-xs btn-ghost text-xs text-base-content/70 hover:text-base-content"
        onClick={() => {
          resetToSystemDefault();
          onClose();
        }}
        disabled={!hasUserPreference}
      >
        {resetLabel}
      </button>
    </div>
  );
}

function Drawer(): JSX.Element {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const { t, i18n } = useTranslation();
  const resolvedLanguage = i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE;
  const direction =
    typeof i18n.dir === "function"
      ? i18n.dir(resolvedLanguage)
      : typeof document !== "undefined"
        ? (document.documentElement?.dir ?? "ltr")
        : "ltr";
  const collapsedTranslateClass = direction === "rtl" ? "-translate-x-full" : "translate-x-full";
  const triggerLabel = t("controls-trigger-label", { defaultValue: "Controls" });

  return (
    <div className="global-controls__drawer">
      <button
        type="button"
        aria-controls="global-controls-drawer"
        aria-expanded={open}
        className="global-controls__trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        {triggerLabel}
      </button>
      <div
        id="global-controls-drawer"
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        aria-labelledby={headingId}
        className={`transition-all duration-200 ${
          open
            ? "pointer-events-auto translate-x-0 opacity-100"
            : `pointer-events-none ${collapsedTranslateClass} opacity-0`
        }`}
      >
        {open ? <DrawerPanel headingId={headingId} onClose={() => setOpen(false)} /> : null}
      </div>
    </div>
  );
}

function FloatingStack(): JSX.Element {
  return (
    <div className="global-controls__stack">
      <DisplayModeToggleButton />
      <ThemeToggleButton />
      <LanguageSelect />
    </div>
  );
}

/**
 * Renders the theme, display-mode, and language controls appropriate for the
 * current display context.
 *
 * - **Hosted mode**: a vertically stacked set of floating control buttons.
 * - **Full-browser mode**: a side-anchored slide-out drawer with a labelled
 *   panel containing all controls.
 */
export function GlobalControls(): JSX.Element {
  const { isHosted } = useDisplayMode();

  return isHosted ? <FloatingStack /> : <Drawer />;
}
