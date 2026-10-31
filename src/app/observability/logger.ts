/** @file Structured logging and error reporting utilities. */

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * A value that may be attached to a structured log context.
 *
 * The type is intentionally closed over JSON-shaped data plus `Error`, which
 * keeps log payloads predictable and serializable. Callers should normalize
 * caught values with {@link toError} before logging them.
 */
export type LogValue =
  | string
  | number
  | boolean
  | null
  | Error
  | readonly LogValue[]
  | { readonly [key: string]: LogValue };

/** Structured key/value detail attached to a log entry. */
export type LogContext = Readonly<Record<string, LogValue>>;

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
}

/**
 * Normalize a caught value to an `Error`.
 *
 * JavaScript permits throwing any value, so `catch` bindings are typed
 * `unknown`. Logging and reporting need an `Error`; non-`Error` throws are
 * wrapped with the thrown value preserved as the cause.
 *
 * @param cause - The value caught from a `try`/`catch` block.
 * @returns The original `Error`, or a wrapper that retains the thrown value.
 *
 * @example
 * ```ts
 * try {
 *   risky();
 * } catch (cause) {
 *   appLogger.error("risky() failed", {}, toError(cause));
 * }
 * ```
 */
export function toError(cause: unknown): Error {
  if (cause instanceof Error) return cause;
  return new Error("Non-Error value thrown", { cause });
}

/**
 * Serialize `value` to a JSON string without throwing.
 *
 * Handles circular references by replacing them with `"[Circular]"` and
 * serializes `Error` instances to include `name`, `message`, and `stack` so
 * diagnostic details are preserved in log output.
 */
function safeStringify(value: LogValue): string {
  const seen = new Set<object>();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (val instanceof Error) {
        return { name: val.name, message: val.message, stack: val.stack };
      }
      if (val instanceof Object) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
  } catch {
    return "[unserializable]";
  }
}

/**
 * Render a log entry as one line: level, timestamp, message, then context.
 *
 * The context is appended only when it has at least one key, so a bare
 * message is not followed by an empty `{}`.
 */
function formatLogEntry(entry: LogEntry): string {
  const parts = [`[${entry.level.toUpperCase()}]`, entry.timestamp, entry.message];
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(safeStringify(entry.context));
  }
  return parts.join(" ");
}

/**
 * Build a log entry, stamping it with the current time.
 *
 * `context` and `error` are attached only when supplied, so optional fields
 * stay distinguishable from explicitly present but empty values.
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error,
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };
  if (context) {
    entry.context = context;
  }
  if (error !== undefined) {
    entry.error = error;
  }
  return entry;
}

/**
 * Write one entry at `level` to the matching console method.
 *
 * Error-level entries pass the `Error` object as a second console argument so
 * the browser can render its stack, while debug entries do the same for
 * parity; the formatted line already carries the serialized context.
 */
function log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
  const entry = createLogEntry(level, message, context, error);
  const formatted = formatLogEntry(entry);

  switch (level) {
    case "debug": {
      console.debug(formatted, error ?? "");
      break;
    }
    case "info": {
      console.info(formatted);
      break;
    }
    case "warn": {
      console.warn(formatted);
      break;
    }
    case "error": {
      console.error(formatted, error ?? "");
      break;
    }
  }
}

/**
 * Structured application logger exposing `debug`, `info`, `warn`, and `error`
 * methods. Each call formats a timestamped log entry and writes it to the
 * console.
 *
 * In production this object should be extended to forward entries to a remote
 * observability sink (e.g. a Sentry DSN or a telemetry adapter conforming to
 * the `TelemetrySink` port).
 */
export const appLogger = {
  /** Logs a debug-level entry; use for verbose diagnostic detail. */
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  /** Logs an info-level entry; use for routine operational events. */
  info: (message: string, context?: LogContext) => log("info", message, context),
  /** Logs a warn-level entry; use for recoverable, unexpected conditions. */
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  /** Logs an error-level entry, optionally attaching the causing error. */
  error: (message: string, context?: LogContext, error?: Error) =>
    log("error", message, context, error),
};

/**
 * Report an error to the observability system.
 * In production, this would send to an error tracking service.
 */
export function reportError(error: Error, context?: LogContext): void {
  appLogger.error("Error reported", context, error);
}
