/** @file Configures TanStack Router with the application route tree. */

import { createRouter, RouterProvider } from "@tanstack/react-router";
import type { JSX } from "react";

import { routeTree } from "./route-tree";

function normalizeBasePath(input: string | undefined): string {
  if (!input || input === "/") {
    return "/";
  }
  const trimmed = input.trim();
  if (trimmed === "" || trimmed === "/") {
    return "/";
  }
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
}

const routerBasePath = normalizeBasePath(import.meta.env.BASE_URL);

/**
 * Create a new TanStack Router instance configured with the application route
 * tree and the Vite base path. Tests can call this to obtain an isolated router
 * instance without affecting the shared singleton.
 */
export function createAppRouter() {
  return createRouter({
    routeTree,
    basepath: routerBasePath,
  });
}

/** Shared router singleton used by the production application entry point. */
export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/** Props accepted by {@link AppRoutes}. */
export interface AppRoutesProps {
  /**
   * Optional router instance. Tests can supply their own router to control the
   * initial location without mutating the shared singleton.
   */
  routerInstance?: ReturnType<typeof createAppRouter>;
}

/**
 * Renders the TanStack `RouterProvider` with the given router instance.
 * Accepts an optional `routerInstance` so that tests can inject isolated
 * routers without mutating the shared singleton.
 */
export function AppRoutes({ routerInstance = router }: AppRoutesProps = {}): JSX.Element {
  return <RouterProvider router={routerInstance} />;
}
