import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import React, { act } from "react";

import { DEFAULT_LOCALE } from "../src/app/i18n/supported-locales";
import i18n, { i18nReady } from "../src/i18n";
import { AppRoot, LoadingBackdrop, renderApp } from "../src/main";

type DeferredComponent = {
  Component: React.ComponentType;
  resolve: () => void;
};

function createDeferredComponent(label: string): DeferredComponent {
  let resolver: (() => void) | undefined;

  const promise = new Promise<{ default: () => React.ReactElement }>((resolve) => {
    resolver = () => resolve({ default: () => <p>{label}</p> });
  });

  return {
    Component: React.lazy(() => promise),
    resolve: () => resolver?.(),
  };
}

describe("main entry Suspense flow", () => {
  beforeEach(async () => {
    await i18nReady;
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("renders the loading backdrop whilst the app is suspended", async () => {
    const { Component, resolve } = createDeferredComponent("App ready");

    await act(async () => {
      render(<AppRoot AppComponent={Component} fallback={<LoadingBackdrop />} />);
    });

    expect(screen.getByRole("status", { name: /loading/i })).toBeTruthy();

    await act(async () => {
      resolve();
    });

    expect(await screen.findByText("App ready")).toBeTruthy();
  });

  it("mounts the SPA via renderApp for imperative hosts", async () => {
    const mount = document.createElement("div");
    document.body.append(mount);

    let dispose: (() => void) | undefined;

    await act(async () => {
      const mountedRoot = renderApp(mount, {
        AppComponent: () => <p>Mounted</p>,
      }) as unknown as { unmount: () => void };
      dispose = () => mountedRoot.unmount();
      await Promise.resolve();
    });

    expect(mount.textContent).toContain("Mounted");

    act(() => {
      dispose?.();
    });
  });

  it("exposes polite status semantics on the loading backdrop", async () => {
    await act(async () => {
      render(<LoadingBackdrop />);
    });

    const output = screen.getByRole("status");
    expect(output.getAttribute("aria-live")).toBe("polite");
    expect(output.textContent).toMatch(/loading/i);
  });
});
