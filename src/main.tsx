/** @file Bootstraps the SPA for Bun's HTML entry point. */

import React, { type ComponentType, type JSX, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useTranslation } from "react-i18next";

import "./i18n";

import App from "./app/app";
import "./index.css";

export function LoadingBackdrop(): JSX.Element {
  const { t } = useTranslation();
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

export interface AppRootProps {
  readonly AppComponent?: ComponentType;
  readonly fallback?: ReactNode;
}

export function AppRoot({ AppComponent = App, fallback }: AppRootProps = {}): JSX.Element {
  return (
    <React.StrictMode>
      <React.Suspense fallback={fallback ?? <LoadingBackdrop />}>
        <AppComponent />
      </React.Suspense>
    </React.StrictMode>
  );
}

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
