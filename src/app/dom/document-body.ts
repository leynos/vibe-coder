/** @file Access to the document body with its real, nullable runtime type. */

/**
 * Return the document body, or `null` when the document has no `<body>` yet.
 *
 * `lib.dom` declares `Document.body` as a non-null `HTMLElement`, but the
 * property is `null` until the parser creates the element. Early module
 * evaluation and partial documents can therefore observe a null state the
 * type omits, so callers must still guard against it.
 *
 * @returns The body element, or `null` when the document has none.
 *
 * @example
 * ```ts
 * const body = getDocumentBody();
 * if (!body) return; // the document has not been parsed far enough yet
 * body.setAttribute("data-theme", "vibe-coder-night");
 * ```
 */
export function getDocumentBody(): HTMLElement | null {
  // SAFETY: the DOM specification defines `Document.body` as nullable before
  // the body element exists; lib.dom's non-null declaration omits that state.
  return document.body as HTMLElement | null;
}
