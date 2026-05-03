import { Window } from "happy-dom";

import { setupI18nTestHarness } from "./support/i18n-test-runtime";

const registerAssetImportStubs = (): void => {
  const bunGlobal = globalThis as unknown as {
    Bun?: {
      plugin?: (plugin: {
        name: string;
        setup: (builder: {
          onLoad: (
            options: { filter: RegExp },
            handler: (args: { path: string }) => { contents: string; loader: "js" },
          ) => void;
        }) => void;
      }) => void;
    };
  };

  bunGlobal.Bun?.plugin?.({
    name: "test-assets",
    setup(builder) {
      builder.onLoad(
        { filter: /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i },
        (args): { contents: string; loader: "js" } => ({
          contents: `export default ${JSON.stringify(args.path)};`,
          loader: "js",
        }),
      );
    },
  });
};

registerAssetImportStubs();

const happyWindow = new Window();

const extendedGlobal = globalThis as typeof globalThis & {
  NodeFilter?: typeof NodeFilter;
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

Object.assign(extendedGlobal, {
  window: happyWindow,
  document: happyWindow.document,
  navigator: happyWindow.navigator,
  HTMLElement: happyWindow.HTMLElement,
  HTMLInputElement:
    (happyWindow as unknown as { HTMLInputElement?: typeof HTMLInputElement }).HTMLInputElement ??
    happyWindow.HTMLElement,
  CustomEvent: happyWindow.CustomEvent,
  Event: happyWindow.Event,
  Node: happyWindow.Node,
  Text: happyWindow.Text,
  MutationObserver: happyWindow.MutationObserver,
  DocumentFragment: happyWindow.DocumentFragment,
  ResizeObserver: (happyWindow as unknown as { ResizeObserver?: typeof ResizeObserver })
    .ResizeObserver,
  requestAnimationFrame: happyWindow.requestAnimationFrame.bind(happyWindow),
  cancelAnimationFrame: happyWindow.cancelAnimationFrame.bind(happyWindow),
  getComputedStyle: happyWindow.getComputedStyle.bind(happyWindow),
  localStorage: happyWindow.localStorage,
  sessionStorage: happyWindow.sessionStorage,
  location: happyWindow.location,
  history: happyWindow.history,
  customElements: happyWindow.customElements,
});

Object.defineProperty(extendedGlobal, "self", {
  value: globalThis.window,
  writable: false,
  configurable: true,
});
class NodeFilterFallback {
  static readonly FILTER_ACCEPT = 1;
  static readonly FILTER_REJECT = 2;
  static readonly FILTER_SKIP = 3;
  static readonly SHOW_ALL = 0xffffffff;
  static readonly SHOW_ATTRIBUTE = 2;
  static readonly SHOW_CDATA_SECTION = 8;
  static readonly SHOW_COMMENT = 128;
  static readonly SHOW_DOCUMENT = 256;
  static readonly SHOW_DOCUMENT_FRAGMENT = 1024;
  static readonly SHOW_DOCUMENT_TYPE = 512;
  static readonly SHOW_ELEMENT = 1;
  static readonly SHOW_ENTITY = 32;
  static readonly SHOW_ENTITY_REFERENCE = 16;
  static readonly SHOW_NOTATION = 2048;
  static readonly SHOW_PROCESSING_INSTRUCTION = 64;
  static readonly SHOW_TEXT = 4;

  acceptNode(_node: Node): number {
    return NodeFilterFallback.FILTER_ACCEPT;
  }
}

extendedGlobal.NodeFilter =
  (happyWindow as unknown as { NodeFilter?: typeof NodeFilter }).NodeFilter ?? NodeFilterFallback;

extendedGlobal.IS_REACT_ACT_ENVIRONMENT = true;

if (!globalThis.ResizeObserver) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

await setupI18nTestHarness(extendedGlobal);

await import("./setup-vitest-a11y");
