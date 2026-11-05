/** @file Access to document roots through an explicit document source. */

/**
 * Return the body element of `source`, or `null` when there is no document or
 * no `<body>` yet.
 *
 * `lib.dom` declares `Document.body` as a non-null `HTMLElement`, but the
 * property is `null` until the parser creates the element. Earlier still,
 * outside a browser runtime there is no `document` at all, so reading the
 * global throws a `ReferenceError` before any nullable property access can
 * help. Taking the document as a parameter keeps that dependency visible and
 * lets callers pass `undefined` when no document exists.
 *
 * @param source - The document to read, or `undefined` outside a DOM runtime.
 *
 * @returns The body element, or `null` when none is available.
 *
 * @example
 * ```ts
 * const body = getDocumentBody(getAmbientDocument());
 * if (!body) return; // no browser document, or no <body> yet
 * body.setAttribute("data-theme", "vibe-coder-night");
 * ```
 */
export function getDocumentBody(source: Document | undefined): HTMLElement | null {
  if (source === undefined) return null;

  // SAFETY: the DOM specification defines `Document.body` as nullable before
  // the body element exists; lib.dom's non-null declaration omits that state.
  return source.body as HTMLElement | null;
}

/**
 * Return the document element of `source`, or `null` when there is no document
 * or no root element yet.
 *
 * `lib.dom` declares `Document.documentElement` as a non-null `HTMLElement`,
 * but a document that is still being parsed can report `null`, and outside a
 * browser runtime the `document` global does not exist at all. Locale and
 * theme application run during module evaluation, so they must tolerate both
 * states rather than assigning to a missing element.
 *
 * @param source - The document to read, or `undefined` outside a DOM runtime.
 *
 * @returns The root element, or `null` when none is available.
 *
 * @example
 * ```ts
 * const root = getDocumentElement(getAmbientDocument());
 * if (!root) return; // no browser document, or no root element yet
 * root.lang = "en-GB";
 * ```
 */
export function getDocumentElement(source: Document | undefined): HTMLElement | null {
  if (source === undefined) return null;

  // SAFETY: the DOM specification permits a null `documentElement` while the
  // document is parsed; lib.dom's non-null declaration omits that state.
  return source.documentElement as HTMLElement | null;
}

/**
 * Return the browser's `document`, or `undefined` outside a DOM runtime.
 *
 * This is the only place in the module tree that reads the ambient global, so
 * every other consumer takes a document argument and stays testable with a
 * stub. Callers at the application edge use this accessor once per operation.
 *
 * @returns The global document, or `undefined` when none exists.
 *
 * @example
 * ```ts
 * const body = getDocumentBody(getAmbientDocument());
 * // `body` is `null` in a Bun script and the real body in a browser.
 * ```
 */
export function getAmbientDocument(): Document | undefined {
  if (typeof document === "undefined") return undefined;
  return document;
}
