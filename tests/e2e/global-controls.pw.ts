/**
 * @file End-to-end coverage for the global display, theme, and locale controls.
 *
 * The configured viewport is 390x844, so the application starts in
 * full-browser mode and exposes its controls through the slide-out drawer.
 * These tests drive the real application: they open the drawer, change each
 * preference, reload the page to prove the choice persisted, and check the
 * document direction the locale selector applies.
 */

import { expect, type Page, test } from "@playwright/test";

const DISPLAY_MODE_KEY = "vibecoder.displayMode";
const THEME_KEY = "vibe-coder.theme";

/** Read one localStorage entry from the page under test. */
async function readStoredValue(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((storageKey) => globalThis.localStorage.getItem(storageKey), key);
}

/** Open the full-browser drawer and return its dialog. */
async function openDrawer(page: Page) {
  await page.getByRole("button", { name: "Controls" }).click();
  const drawer = page.getByRole("dialog", { name: "Display & theme" });
  await expect(drawer).toBeVisible();
  return drawer;
}

/**
 * Return the drawer element, which stays mounted while collapsed.
 *
 * A closed drawer is `aria-hidden`, which removes it from role queries, so the
 * element is addressed by the id its trigger points at. That lets the
 * direction tests inspect the collapsed position after the trigger is toggled
 * shut.
 */
function drawerOf(page: Page) {
  return page.locator("#global-controls-drawer");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

test.describe("global controls drawer", () => {
  test("opens and closes from the trigger", async ({ page }) => {
    const drawer = await openDrawer(page);

    await expect(drawer.getByRole("heading", { name: "Display & theme" })).toBeVisible();
    await expect(drawer.getByRole("combobox", { name: "Language" })).toBeVisible();

    await drawer.getByRole("button", { name: "Close display controls" }).click();

    await expect(drawer).toBeHidden();
    await expect(page.getByRole("button", { name: "Controls" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

test.describe("display mode", () => {
  test("persists an explicit choice across a reload", async ({ page }) => {
    const drawer = await openDrawer(page);

    await drawer.getByRole("button", { name: "Switch to Hosted Frame" }).click();

    // Hosted mode replaces the drawer with the floating control stack.
    await expect(page.getByRole("button", { name: "Switch to Full View" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Controls" })).toHaveCount(0);
    expect(await readStoredValue(page, DISPLAY_MODE_KEY)).toBe("hosted");

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "Switch to Full View" })).toBeVisible();
    expect(await readStoredValue(page, DISPLAY_MODE_KEY)).toBe("hosted");
  });

  test("resets to the viewport default and clears the stored preference", async ({ page }) => {
    const drawer = await openDrawer(page);
    await drawer.getByRole("button", { name: "Switch to Hosted Frame" }).click();
    await page.getByRole("button", { name: "Switch to Full View" }).click();

    const reopened = await openDrawer(page);
    await reopened.getByRole("button", { name: "Reset to device default" }).click();

    // The 390px viewport defaults to full-browser mode, so the drawer returns.
    await expect(page.getByRole("button", { name: "Controls" })).toBeVisible();
    expect(await readStoredValue(page, DISPLAY_MODE_KEY)).toBeNull();
  });
});

test.describe("theme", () => {
  test("applies the chosen theme and persists it across a reload", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("data-theme", "vibe-coder-night");

    const drawer = await openDrawer(page);
    await drawer.getByRole("button", { name: "Switch to Day" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "vibe-coder-day");
    await expect(page.locator("body")).toHaveAttribute("data-theme", "vibe-coder-day");
    expect(await readStoredValue(page, THEME_KEY)).toBe("vibe-coder-day");

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "vibe-coder-day");
    const reopened = await openDrawer(page);
    await expect(reopened.getByRole("button", { name: "Switch to Night" })).toBeVisible();
  });
});

test.describe("locale direction", () => {
  test("switches the document to right-to-left for Arabic and back to left-to-right", async ({
    page,
  }) => {
    const drawer = await openDrawer(page);
    const language = drawer.getByRole("combobox", { name: "Language" });

    await language.selectOption("ar");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("data-direction", "rtl");
    await expect(page.locator("body")).toHaveAttribute("dir", "rtl");

    await drawer.getByRole("button", { name: "Close display controls" }).click();
    // The drawer is anchored to the inline end, so RTL collapses it leftwards.
    await expect(drawerOf(page)).toHaveClass(/-translate-x-full/);

    const reopened = await openDrawer(page);
    await reopened.getByRole("combobox", { name: "Language" }).selectOption("en-GB");

    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("body")).toHaveAttribute("dir", "ltr");

    await reopened.getByRole("button", { name: "Close display controls" }).click();
    await expect(drawerOf(page)).not.toHaveClass(/-translate-x-full/);
  });
});
