import { describe, expect, it } from "bun:test";

import { buildFluentLoadPath, normalizeBasePath } from "../src/i18n";

describe("i18n load path", () => {
  it("prefixes the Fluent bundle path with BASE_URL when provided", () => {
    const loadPath = buildFluentLoadPath("/example-app/");
    expect(loadPath).toBe("/example-app/locales/{{lng}}/{{ns}}.ftl");
  });

  it("normalizes missing slashes on base paths", () => {
    expect(normalizeBasePath("example-app")).toBe("/example-app/");
    expect(normalizeBasePath("/example-app")).toBe("/example-app/");
    expect(normalizeBasePath(undefined)).toBe("/");
  });
});
