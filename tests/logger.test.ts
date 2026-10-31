/**
 * @file Unit tests for the structured logger.
 *
 * Covers error normalization, the shape of a formatted log line, and the
 * serialization of errors and circular contexts.
 */

import { afterEach, describe, expect, it, spyOn } from "bun:test";
import type { LogValue } from "../src/app/observability/logger";
import { appLogger, reportError, toError } from "../src/app/observability/logger";

const LINE_PATTERN = /^\[([A-Z]+)\] (\d{4}-\d{2}-\d{2}T[\d:.]+Z) (.*)$/;

/** Return the arguments recorded by a console spy on its first call. */
function firstCall<Call extends readonly unknown[]>(spy: { mock: { calls: Call[] } }): Call {
  const call = spy.mock.calls[0];
  if (!call) {
    throw new Error("expected the console spy to have been called");
  }
  return call;
}

/** A context whose only entry points back at the context itself. */
type SelfReferentialContext = { self: LogValue };

/** Build a context object that refers to itself. */
function circularContext(): SelfReferentialContext {
  const context: SelfReferentialContext = { self: "placeholder" };
  context.self = context;
  return context;
}

describe("toError", () => {
  it("returns an existing Error unchanged", () => {
    const original = new Error("boom");

    expect(toError(original)).toBe(original);
  });

  it("wraps a non-Error value and preserves it as the cause", () => {
    const thrown = { reason: "nope" };

    const wrapped = toError(thrown);

    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toBe("Non-Error value thrown");
    expect(wrapped.cause).toBe(thrown);
  });
});

describe("appLogger", () => {
  const restoreSpies: Array<() => void> = [];

  afterEach(() => {
    while (restoreSpies.length > 0) {
      restoreSpies.pop()?.();
    }
  });

  /** Spy on a console method and silence it for the duration of one test. */
  function spyOnConsole(method: "debug" | "info" | "warn" | "error") {
    const spy = spyOn(console, method).mockImplementation(() => {});
    restoreSpies.push(() => spy.mockRestore());
    return spy;
  }

  it("formats level, timestamp, message, and context", () => {
    const spy = spyOnConsole("info");

    appLogger.info("server started", { port: 8080 });

    const [line] = firstCall(spy);
    const match = LINE_PATTERN.exec(line);
    expect(match?.[1]).toBe("INFO");
    expect(match?.[3]).toBe('server started {"port":8080}');
  });

  it("omits an empty context instead of appending braces", () => {
    const spy = spyOnConsole("info");

    appLogger.info("no detail", {});

    const [line] = firstCall(spy);
    expect(line).not.toContain("{");
    expect(line.endsWith("no detail")).toBe(true);
  });

  it("serializes an Error in the context with its name and message", () => {
    const spy = spyOnConsole("warn");

    appLogger.warn("failed", { error: new Error("disk full") });

    const [line] = firstCall(spy);
    expect(line).toContain('"error":{"name":"Error","message":"disk full"');
  });

  it("replaces circular references instead of throwing", () => {
    const spy = spyOnConsole("info");

    appLogger.info("cyclic", circularContext());

    const [line] = firstCall(spy);
    expect(line).toContain('"self":"[Circular]"');
  });

  it("passes the causing Error to the error console method", () => {
    const spy = spyOnConsole("error");
    const cause = new Error("network down");

    appLogger.error("request failed", { url: "/api" }, cause);

    const [line, attached] = firstCall(spy);
    expect(line).toContain("request failed");
    expect(attached).toBe(cause);
  });

  it("writes debug entries to the debug console method", () => {
    const spy = spyOnConsole("debug");

    appLogger.debug("tracing");

    expect(firstCall(spy)[0]).toContain("tracing");
  });
});

describe("reportError", () => {
  it("logs a reported error at error level with the error attached", () => {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error("unexpected");

    try {
      reportError(cause, { operation: "boot" });

      const [line, attached] = firstCall(spy);
      expect(line).toContain("Error reported");
      expect(line).toContain('"operation":"boot"');
      expect(attached).toBe(cause);
    } finally {
      spy.mockRestore();
    }
  });
});
