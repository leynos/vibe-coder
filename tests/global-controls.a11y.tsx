import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GlobalControls } from "../src/app/layout/global-controls";
import { axe } from "./utils/axe";
import { renderWithProviders } from "./utils/render-with-providers";

describe("GlobalControls accessibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("meets axe rules in the default hosted mode", async () => {
    const { container } = renderWithProviders(<GlobalControls />);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders an accessible drawer after switching into full-browser mode", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<GlobalControls />);

    await user.click(screen.getByRole("button", { name: /switch to full view/i }));
    await user.click(await screen.findByRole("button", { name: /controls/i }));

    expect(await screen.findByRole("dialog", { name: /display & theme/i })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
