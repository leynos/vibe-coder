/** @file Structured logging and error reporting utilities. */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
  timestamp: string;
}

function formatLogEntry(entry: LogEntry): string {
  const parts = [`[${entry.level.toUpperCase()}]`, entry.timestamp, entry.message];
  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
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

export const appLogger = {
  debug: (message: string, context?: Record<string, unknown>) => log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("warn", message, context),
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
