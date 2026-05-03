import { type RenderOptions, type RenderResult, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { DisplayModeProvider } from "../../src/app/providers/display-mode-provider";
import { ThemeProvider } from "../../src/app/providers/theme-provider";

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {}

function ProviderStack({ children }: { children: ReactNode }) {
  return (
    <DisplayModeProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </DisplayModeProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult {
  return render(ui, {
    wrapper: ProviderStack,
    ...options,
  });
}
