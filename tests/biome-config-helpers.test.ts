/**
 * @file Tests for Biome JSONC configuration helpers.
 */

import { describe, expect, it } from "bun:test";

import { parseJsonc } from "./biome-config-helpers";

describe("parseJsonc", () => {
  it("handles mid-line comments followed by a newline", () => {
    expect(parseJsonc('{ "key": 1, // comment\n "other": 2 }')).toEqual({
      key: 1,
      other: 2,
    });
  });

  it("handles line comments at end of file", () => {
    expect(parseJsonc('{ "key": 1 } // EOF comment\n')).toEqual({ key: 1 });
  });

  it("handles unterminated block comments at end of file", () => {
    expect(parseJsonc('{ "key": 1 } /* unfinished')).toEqual({ key: 1 });
  });
});
