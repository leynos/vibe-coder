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

export function createAppRouter() {
  return createRouter({
    routeTree,
    basepath: routerBasePath,
  });
}

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export interface AppRoutesProps {
  /**
   * Optional router instance. Tests can supply their own router to control the
   * initial location without mutating the shared singleton.
   */
  routerInstance?: ReturnType<typeof createAppRouter>;
}

export function AppRoutes({ routerInstance = router }: AppRoutesProps = {}): JSX.Element {
  return <RouterProvider router={routerInstance} />;
}
