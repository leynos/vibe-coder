/**
 * @file Tests for HomeScreen and AboutScreen route components.
 *
 * Verifies that each screen applies the centred-screen CSS component class
 * to its main element (not the raw inline Tailwind class stack) and that the
 * rendered DOM structure remains stable across refactors.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, screen } from "@testing-library/react";

import { AboutScreen, HomeScreen } from "../src/app/routes/route-tree";
import { renderWithProviders } from "./utils/render-with-providers";

describe("HomeScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a main element with the centred-screen component class", () => {
    renderWithProviders(<HomeScreen />);
    const main = screen.getByRole("main");
    expect(main.classList.contains("centred-screen")).toBe(true);
  });

  it("does not use the inline flexbox class stack directly on main", () => {
    renderWithProviders(<HomeScreen />);
    const main = screen.getByRole("main");
    expect(main.className).not.toContain("flex-col items-center justify-center");
  });

  it("renders a level-1 heading", () => {
    renderWithProviders(<HomeScreen />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeTruthy();
  });

  it("renders main innerHTML matching snapshot", () => {
    renderWithProviders(<HomeScreen />);
    const main = screen.getByRole("main");
    expect(main.innerHTML).toMatchSnapshot();
  });
});

describe("AboutScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a main element with the centred-screen component class", () => {
    renderWithProviders(<AboutScreen />);
    const main = screen.getByRole("main");
    expect(main.classList.contains("centred-screen")).toBe(true);
  });

  it("does not use the inline flexbox class stack directly on main", () => {
    renderWithProviders(<AboutScreen />);
    const main = screen.getByRole("main");
    expect(main.className).not.toContain("flex-col items-center justify-center");
  });

  it("renders a level-1 heading", () => {
    renderWithProviders(<AboutScreen />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeTruthy();
  });

  it("renders main innerHTML matching snapshot", () => {
    renderWithProviders(<AboutScreen />);
    const main = screen.getByRole("main");
    expect(main.innerHTML).toMatchSnapshot();
  });
});
