/**
 * @file Tests for Biome JSONC configuration helpers.
 */

import { describe, expect, it } from "bun:test";
import * as v from "valibot";

import { stripJsonComments } from "./biome-config-helpers";

const KeyedJsonSchema = v.object({
  key: v.number(),
  other: v.optional(v.number()),
});

const parseKeyedJson = (text: string): v.InferOutput<typeof KeyedJsonSchema> =>
  v.parse(KeyedJsonSchema, JSON.parse(stripJsonComments(text)));

describe("stripJsonComments", () => {
  it("handles mid-line comments followed by a newline", () => {
    const parsed = parseKeyedJson('{ "key": 1, // comment\n "other": 2 }');

    expect(parsed.key).toBe(1);
    expect(parsed.other).toBe(2);
  });

  it("handles line comments at end of file", () => {
    expect(parseKeyedJson('{ "key": 1 } // EOF comment\n').key).toBe(1);
  });

  it("rejects unterminated block comments at end of file", () => {
    expect(() => stripJsonComments('{ "key": 1 } /* unfinished')).toThrow(SyntaxError);
    expect(() => stripJsonComments('{ "key": 1 } /* unfinished')).toThrow(
      "Unterminated block comment",
    );
  });
});
