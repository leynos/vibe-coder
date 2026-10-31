/**
 * @file Unit tests for the nullable document root helpers.
 *
 * `lib.dom` declares `Document.body` and `Document.documentElement` as
 * non-null, but both are nullable while a document is parsed. These cases
 * verify the helpers report that runtime state honestly, so callers can guard
 * against it instead of dereferencing a missing element.
 */

import { afterEach, describe, expect, it } from "bun:test";

import { getDocumentBody, getDocumentElement } from "../src/app/dom/document-body";

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
    expect(getDocumentElement()).toBe(document.documentElement);
    expect(getDocumentBody()).toBe(document.body);
  });

  it("reports a null document element while the document has no root", () => {
    Object.defineProperty(document, "documentElement", { configurable: true, value: null });

    expect(getDocumentElement()).toBeNull();
  });

  it("reports a null body while the document has no body element", () => {
    Object.defineProperty(document, "body", { configurable: true, value: null });

    expect(getDocumentBody()).toBeNull();
  });
});
