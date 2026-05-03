/** @file Root TanStack Router route hosting the SPA outlet. */

import { createRootRoute, Outlet } from "@tanstack/react-router";
import type { JSX } from "react";

import { GlobalControls } from "../layout/global-controls";

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
