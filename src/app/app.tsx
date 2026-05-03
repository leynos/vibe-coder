/** @file Application root wiring shared providers and the initial route shell. */

import type { JSX } from "react";
import { DisplayModeProvider } from "./providers/display-mode-provider";
import { ThemeProvider } from "./providers/theme-provider";
import { AppRoutes } from "./routes/app-routes";

/**
 * Entry point for the mockup SPA.
 *
 * @example
 * ```tsx
 * import App from "./app/app";
 *
 * export function Bootstrap() {
 *   return <App />;
 * }
 * ```
 */
export default function App(): JSX.Element {
  return (
    <DisplayModeProvider>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </DisplayModeProvider>
  );
}
