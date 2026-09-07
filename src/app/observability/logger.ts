/** @file Structured logging and error reporting utilities. */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
  timestamp: string;
}

/**
 * Serialize `value` to a JSON string without throwing.
 *
 * Handles circular references by replacing them with `"[Circular]"` and
 * serializes `Error` instances to include `name`, `message`, and `stack` so
 * diagnostic details are preserved in log output.
 */
function safeStringify(value: unknown): string {
  const seen = new Set<unknown>();
  try {
    return JSON.stringify(value, (_key, val: unknown) => {
      if (val instanceof Error) {
        return { name: val.name, message: val.message, stack: val.stack };
      }
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
  } catch {
    return "[unserializable]";
  }
}

function formatLogEntry(entry: LogEntry): string {
  const parts = [`[${entry.level.toUpperCase()}]`, entry.timestamp, entry.message];
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(safeStringify(entry.context));
  }
  return parts.join(" ");
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: unknown,
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
    ...(typeof error !== "undefined" ? { error } : {}),
  };
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
  const entry = createLogEntry(level, message, context, error);
  const formatted = formatLogEntry(entry);

  switch (level) {
    case "debug":
      console.debug(formatted, error ?? "");
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted, error ?? "");
      break;
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
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  /** Logs an info-level entry; use for routine operational events. */
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  /** Logs a warn-level entry; use for recoverable, unexpected conditions. */
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
  /** Logs an error-level entry, optionally attaching the causing error. */
  error: (message: string, context?: Record<string, unknown>, error?: unknown) =>
    log("error", message, context, error),
};

/**
 * Report an error to the observability system.
 * In production, this would send to an error tracking service.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  appLogger.error("Error reported", context, error);
}
