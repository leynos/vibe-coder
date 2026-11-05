/**
 * @file Unit tests for the nullable document root helpers.
 *
 * `lib.dom` declares `Document.body` and `Document.documentElement` as
 * non-null, but both are nullable while a document is parsed, and outside a
 * browser runtime there is no document at all. These cases verify the helpers
 * report that runtime state honestly, so callers can guard against it instead
 * of dereferencing a missing element.
 */

import { afterEach, describe, expect, it } from "bun:test";

import {
  getAmbientDocument,
  getDocumentBody,
  getDocumentElement,
} from "../src/app/dom/document-body";

const originalBody = Object.getOwnPropertyDescriptor(document, "body");
const originalRoot = Object.getOwnPropertyDescriptor(document, "documentElement");

afterEach(() => {
  if (originalBody) {
    Object.defineProperty(document, "body", originalBody);
  } else {
    Reflect.deleteProperty(document, "body");
  }

  if (originalRoot) {
    Object.defineProperty(document, "documentElement", originalRoot);
  } else {
    Reflect.deleteProperty(document, "documentElement");
  }
});

describe("document root helpers", () => {
  it("returns the parsed document element and body", () => {
    expect(getDocumentElement(document)).toBe(document.documentElement);
    expect(getDocumentBody(document)).toBe(document.body);
  });

  it("reports a null document element while the document has no root", () => {
    Object.defineProperty(document, "documentElement", { configurable: true, value: null });

    expect(getDocumentElement(document)).toBeNull();
  });

  it("reports a null body while the document has no body element", () => {
    Object.defineProperty(document, "body", { configurable: true, value: null });

    expect(getDocumentBody(document)).toBeNull();
  });

  it("reports an explicit unavailable result when there is no document", () => {
    // Outside a browser runtime the `document` global does not exist, so a
    // helper that read it directly would throw `ReferenceError` before any
    // nullable property check could run. Destructuring an empty list yields
    // the `undefined` case without writing a literal `undefined` argument,
    // which `unicorn/no-useless-undefined` rejects.
    // SAFETY: the empty list is never indexed, and `noUncheckedIndexedAccess`
    // types its first element as `Document | undefined`, which is exactly the
    // missing-document case under test.
    const [missingDocument] = [] as Document[];

    expect(getDocumentElement(missingDocument)).toBeNull();
    expect(getDocumentBody(missingDocument)).toBeNull();
  });

  it("reads the ambient document through the single accessor", () => {
    expect(getAmbientDocument()).toBe(document);
  });
});
