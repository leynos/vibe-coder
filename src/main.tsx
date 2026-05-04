/** @file Bootstraps the SPA for Bun's HTML entry point. */

import React, { type ComponentType, type JSX, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useTranslation } from "react-i18next";

import "./i18n";

import App from "./app/app";
import "./index.css";

/**
 * Accessible loading indicator displayed while the application bundle hydrates.
 *
 * @example
 * ```tsx
 * <React.Suspense fallback={<LoadingBackdrop />}>
 *   <App />
 * </React.Suspense>
 * // Shows a polite, labelled loading line until children resolve.
 * ```
 */
export function LoadingBackdrop(): JSX.Element {
  const { t } = useTranslation("common", { useSuspense: false });
  const label = t("loading", { defaultValue: "Loading…" });
  return (
    <output
      aria-live="polite"
      aria-label={label}
      className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-base-content/70"
    >
      {label}
    </output>
  );
}

/** Props accepted by the {@link AppRoot} bootstrap wrapper. */
export interface AppRootProps {
  readonly AppComponent?: ComponentType;
  readonly fallback?: ReactNode;
}

/**
 * Root React tree providing StrictMode and Suspense boundaries for the SPA.
 *
 * Renders the given `AppComponent` inside `React.StrictMode` with a Suspense
 * fallback, defaulting to {@link LoadingBackdrop} when none is provided.
 *
 * @example
 * ```tsx
 * createRoot(document.getElementById("root")!).render(<AppRoot />);
 * // Mounts StrictMode, Suspense with LoadingBackdrop, and the default App.
 * ```
 */
export function AppRoot({ AppComponent = App, fallback }: AppRootProps = {}): JSX.Element {
  return (
    <React.StrictMode>
      <React.Suspense fallback={fallback ?? <LoadingBackdrop />}>
        <AppComponent />
      </React.Suspense>
    </React.StrictMode>
  );
}

/**
 * Mount the SPA at the given DOM element and return the React root handle.
 *
 * @param target - The root `HTMLElement` to mount the application into.
 * @param props - Optional overrides for `AppComponent` and Suspense fallback.
 * @returns The React root, which callers may use to unmount or update the tree.
 *
 * @example
 * ```tsx
 * const root = renderApp(document.getElementById("root")!, {
 *   fallback: <p>Booting…</p>,
 * });
 * // SPA is rendered into `target`; call root.unmount() to tear down.
 * ```
 */
export function renderApp(target: HTMLElement, props?: AppRootProps): Root {
  const root = createRoot(target);
  root.render(<AppRoot {...props} />);
  return root;
}

const isTestEnvironment = typeof process !== "undefined" && process.env?.NODE_ENV === "test";

if (!isTestEnvironment) {
  const mount = document.body?.children.namedItem("root");

  if (!(mount instanceof HTMLElement)) {
    throw new Error("Mount point '#root' is required to render the SPA.");
  }

  renderApp(mount);
}
