/**
 * @file Compile-time contract tests for the structured logging types.
 *
 * Asserts that `LogValue` accepts only JSON-shaped data and `Error`, and that
 * the logger signatures keep their documented argument and return types. The
 * `@ts-expect-error` assertions are enforced by `bun check:types` because
 * `tsconfig.json` includes `tests/`.
 */

import { describe, expectTypeOf, spyOn, test } from "bun:test";
import type { LogContext, LogValue } from "../src/app/observability/logger";
import { appLogger, type reportError, type toError } from "../src/app/observability/logger";

const nestedValue = {
  name: "run",
  attempts: [1, 2, 3],
  error: new Error("boom"),
  detail: { nullable: null, flag: true },
} satisfies LogValue;

const contextValue = {
  operation: "boot",
  attempt: 2,
  failure: new Error("boom"),
} satisfies LogContext;

describe("LogValue type contracts", () => {
  test("accepts primitives, errors, arrays, and nested objects", () => {
    expectTypeOf<string>().toExtend<LogValue>();
    expectTypeOf<number>().toExtend<LogValue>();
    expectTypeOf<boolean>().toExtend<LogValue>();
    expectTypeOf<null>().toExtend<LogValue>();
    expectTypeOf<Error>().toExtend<LogValue>();
    expectTypeOf<readonly LogValue[]>().toExtend<LogValue>();
    expectTypeOf<typeof nestedValue>().toExtend<LogValue>();
  });

  test("rejects values that cannot be serialized", () => {
    // @ts-expect-error: `undefined` is not JSON-representable and has no slot in LogValue.
    const undefinedValue: LogValue = undefined;
    // @ts-expect-error: functions cannot be serialized into a log payload.
    const functionValue: LogValue = () => nestedValue.name;
    // @ts-expect-error: class instances other than Error are outside the closed union.
    const dateValue: LogValue = new Date(0);

    void undefinedValue;
    void functionValue;
    void dateValue;
  });
});

describe("LogContext type contracts", () => {
  test("accepts a read-only record of log values", () => {
    expectTypeOf<typeof contextValue>().toExtend<LogContext>();
    expectTypeOf<LogContext>().toEqualTypeOf<Readonly<Record<string, LogValue>>>();
  });

  test("rejects values outside the closed union", () => {
    // @ts-expect-error: a function is not a LogValue, so it cannot be a context entry.
    const invalidContext: LogContext = { handler: () => "side effect" };

    void invalidContext;
  });
});

describe("logger function contracts", () => {
  test("normalizes unknown values to Error", () => {
    expectTypeOf<ReturnType<typeof toError>>().toEqualTypeOf<Error>();
    expectTypeOf<Parameters<typeof toError>[0]>().toBeUnknown();
  });

  test("reports errors and returns nothing", () => {
    expectTypeOf<ReturnType<typeof reportError>>().toEqualTypeOf<void>();
    expectTypeOf<Parameters<typeof reportError>[0]>().toEqualTypeOf<Error>();
  });

  test("accepts an optional context and an optional causing error", () => {
    expectTypeOf<Parameters<typeof appLogger.error>[1]>().toEqualTypeOf<LogContext | undefined>();
    expectTypeOf<Parameters<typeof appLogger.error>[2]>().toEqualTypeOf<Error | undefined>();
  });

  test("rejects a context object in the causing-error slot", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});

    try {
      // @ts-expect-error: the third argument is the causing Error, not another context object.
      appLogger.error("failed", {}, { operation: "boot" });
    } finally {
      spy.mockRestore();
    }
  });
});
