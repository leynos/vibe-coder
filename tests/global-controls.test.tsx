/**
 * @file Behavioural tests for the global controls bar.
 *
 * Exercises language selection, theme switching, and display-mode controls
 * through their user-visible labels rather than implementation details.
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { act } from "react";

import { GlobalControls } from "../src/app/layout/global-controls";
import i18n from "../src/i18n";
import { renderWithProviders } from "./utils/render-with-providers";

describe("GlobalControls", () => {
  beforeEach(() => {
    cleanup();
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    globalThis.localStorage.clear();
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

  it("collapses the drawer toward the right in right-to-left locales", () => {
    // Only the en-GB bundle ships, so switching the runtime to "ar" would
    // suspend on a missing namespace. Stub the direction lookup instead: the
    // drawer's branch selection is what this test pins.
    const dirSpy = spyOn(i18n, "dir").mockReturnValue("rtl");

    try {
      renderWithProviders(<GlobalControls />);

      act(() => {
        screen.getByRole("button", { name: /switch to full view/i }).click();
      });

      // The drawer stays mounted while collapsed, so include hidden nodes when
      // querying for it.
      const drawer = screen.getByRole("dialog", { hidden: true });
      expect(drawer.className).toContain("-translate-x-full");
    } finally {
      dirSpy.mockRestore();
    }
  });

  it("collapses the drawer toward the left in left-to-right locales", () => {
    renderWithProviders(<GlobalControls />);

    act(() => {
      screen.getByRole("button", { name: /switch to full view/i }).click();
    });

    const drawer = screen.getByRole("dialog", { hidden: true });
    expect(drawer.className).toContain("translate-x-full");
    expect(drawer.className).not.toContain("-translate-x-full");
  });

  it("restores the previous selection when a language change is rejected", async () => {
    const previousLanguage = i18n.resolvedLanguage ?? i18n.language;
    const changeSpy = spyOn(i18n, "changeLanguage").mockRejectedValue(
      new Error("language backend unavailable"),
    );
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    try {
      renderWithProviders(<GlobalControls />);

      // SAFETY: the query targets the language <select>, whose element type
      // the assertions below rely on.
      const select = screen.getByRole("combobox", { name: /language/i }) as HTMLSelectElement;

      await act(async () => {
        fireEvent.change(select, { target: { value: "ar" } });
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(select.value).toBe(previousLanguage);
      expect(select.disabled).toBe(false);
      const logged = errorSpy.mock.calls.map((call) => String(call[0])).join("\n");
      expect(logged).toContain("Failed to change language");
      expect(logged).toContain("Error reported");
    } finally {
      changeSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
