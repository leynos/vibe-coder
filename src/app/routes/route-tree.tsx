/** @file Generated route tree for TanStack Router. */

import { createRoute } from "@tanstack/react-router";
import type { JSX } from "react";
import { useTranslation } from "react-i18next";

import { MobileShell } from "../layout/mobile-shell";
import { rootRoute } from "./root-route";

function HomeScreen(): JSX.Element {
  const { t } = useTranslation();
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold text-base-content">
          {t("home-title", { defaultValue: "Vibecoder" })}
        </h1>
        <p className="text-center text-base-content/70">
          {t("home-description", { defaultValue: "Welcome to your new mockup application." })}
        </p>
      </main>
    </MobileShell>
  );
}

function AboutScreen(): JSX.Element {
  const { t } = useTranslation();
  return (
    <MobileShell>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold text-base-content">
          {t("about-title", { defaultValue: "About" })}
        </h1>
        <p className="text-center text-base-content/70">
          {t("about-description", {
            defaultValue: "This is a TypeScript/React mockup with accessibility-first design.",
          })}
        </p>
      </main>
    </MobileShell>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeScreen,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: AboutScreen,
});

export const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);
