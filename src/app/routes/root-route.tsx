/** @file Root TanStack Router route hosting the SPA outlet. */

import { createRootRoute, Outlet } from "@tanstack/react-router";
import type { JSX } from "react";

import { GlobalControls } from "../layout/global-controls";

/**
 * TanStack Router root route that hosts the page outlet and mounts the
 * {@link GlobalControls} overlay. All application leaf routes are children of
 * this route.
 */
export const rootRoute = createRootRoute({
  component: function RootRoute(): JSX.Element {
    return (
      <>
        <Outlet />
        <GlobalControls />
      </>
    );
  },
});
