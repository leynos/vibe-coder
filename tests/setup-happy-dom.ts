/**
 * @file Bun test preload that installs a Happy DOM window.
 *
 * Registers the DOM globals, teaches the bundler to treat imported image
 * assets as modules, and installs the shared i18n test harness so component
 * suites can render without a browser.
 */

import { Window } from "happy-dom";

import { setupI18nTestHarness } from "./support/i18n-test-runtime";
import { installMatchMediaStub } from "./support/match-media-stub";

/**
 * Teach Bun to treat imported image assets as JavaScript modules during tests.
 *
 * The plugin hook only exists under the Bun test runner, so other runners skip
 * registration rather than failing to load the preload.
 */
const registerAssetImportStubs = (): void => {
  if (!("Bun" in globalThis)) {
    return;
  }

  Bun.plugin({
    name: "test-assets",
    setup(builder) {
      builder.onLoad({ filter: /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i }, (args) => ({
        contents: `export default ${JSON.stringify(args.path)};`,
        loader: "js",
      }));
    },
  });
};

registerAssetImportStubs();

const happyWindow = new Window();

// Happy DOM's classes are structurally compatible with the DOM lib globals the
// application code imports; `Object.assign` installs them for both Bun and
// Vitest preloads.
Object.assign(globalThis, {
  window: happyWindow,
  document: happyWindow.document,
  navigator: happyWindow.navigator,
  HTMLElement: happyWindow.HTMLElement,
  HTMLInputElement: happyWindow.HTMLInputElement,
  CustomEvent: happyWindow.CustomEvent,
  Event: happyWindow.Event,
  // `Event` and `EventTarget` must come from the same realm: installing Happy
  // DOM's `Event` beside Node's `EventTarget` makes every `dispatchEvent` of a
  // Happy DOM event fail its instance check. Chai hits that path while
  // registering its assertion plugins.
  EventTarget: happyWindow.EventTarget,
  Node: happyWindow.Node,
  Text: happyWindow.Text,
  MutationObserver: happyWindow.MutationObserver,
  DocumentFragment: happyWindow.DocumentFragment,
  ResizeObserver: happyWindow.ResizeObserver,
  NodeFilter: happyWindow.NodeFilter,
  requestAnimationFrame: happyWindow.requestAnimationFrame.bind(happyWindow),
  cancelAnimationFrame: happyWindow.cancelAnimationFrame.bind(happyWindow),
  getComputedStyle: happyWindow.getComputedStyle.bind(happyWindow),
  localStorage: happyWindow.localStorage,
  sessionStorage: happyWindow.sessionStorage,
  location: happyWindow.location,
  history: happyWindow.history,
  customElements: happyWindow.customElements,
});

Object.defineProperty(globalThis, "self", {
  value: happyWindow,
  writable: false,
  configurable: true,
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

await setupI18nTestHarness(globalThis);

// Only the DOM shim is shared with the Vitest accessibility setup. Importing
// that setup here would load Vitest's runner (through `afterEach`) outside a
// Vitest context, which Bun's test runner cannot satisfy.
installMatchMediaStub();
