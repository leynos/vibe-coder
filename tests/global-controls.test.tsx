import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, screen, within } from "@testing-library/react";
import { act } from "react";

import { GlobalControls } from "../src/app/layout/global-controls";
import { renderWithProviders } from "./utils/render-with-providers";

describe("GlobalControls", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("surfaces the hosted-mode controls stack by default", () => {
    renderWithProviders(<GlobalControls />);

    expect(screen.getByRole("button", { name: /switch to full view/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /switch to day/i })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /language/i })).toBeTruthy();
  });

  it("switches into the drawer interface in full-browser mode", async () => {
    renderWithProviders(<GlobalControls />);

    act(() => {
      screen.getByRole("button", { name: /switch to full view/i }).click();
    });

    const launcher = await screen.findByRole("button", { name: /controls/i });
    expect(launcher.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      launcher.click();
    });

    const dialog = await screen.findByRole("dialog", { name: /display & theme/i });
    expect(within(dialog).getByRole("button", { name: /close display controls/i })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /reset to device default/i })).toBeTruthy();
  });

  it("returns to the hosted stack when the drawer resets to the system default", async () => {
    renderWithProviders(<GlobalControls />);

    act(() => {
      screen.getByRole("button", { name: /switch to full view/i }).click();
    });

    const launcher = await screen.findByRole("button", { name: /controls/i });

    act(() => {
      launcher.click();
    });

    const dialog = await screen.findByRole("dialog", { name: /display & theme/i });

    act(() => {
      within(dialog)
        .getByRole("button", { name: /reset to device default/i })
        .click();
    });

    expect(screen.getByRole("button", { name: /switch to full view/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /controls/i })).toBeNull();
  });
});
