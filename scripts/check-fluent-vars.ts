#!/usr/bin/env bun
/** @file Ensures Fluent translations keep placeholder parity with the base locale. */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import type * as AST from "@fluent/syntax";
import { lineOffset, parse, type Resource, Visitor } from "@fluent/syntax";

type PlaceholderReport = {
  vars: Set<string>;
  ignore: boolean;
};

const BASE_LOCALE = process.env["FTL_BASE_LOCALE"] ?? "en-GB";
const LOCALES_DIR = path.resolve(process.cwd(), "public/locales");
const IGNORE_MARKER = "vars: ignore-mismatch";

/** The subset of `fs.Stats` the directory walk needs. */
type FileStats = {
  isDirectory(): boolean;
  isFile(): boolean;
};

/**
 * The narrow filesystem surface the checker needs.
 *
 * Injecting it keeps the walk and the reads testable without touching the real
 * filesystem, and makes every failure path reachable in a unit test.
 */
export type LocaleFileSystem = {
  readonly stat: (filePath: string) => FileStats;
  readonly readdir: (directoryPath: string) => readonly string[];
  readonly readFile: (filePath: string) => string;
};

const nodeFileSystem: LocaleFileSystem = {
  stat: (filePath) => fs.statSync(filePath),
  readdir: (directoryPath) => fs.readdirSync(directoryPath),
  readFile: (filePath) => fs.readFileSync(filePath, "utf8"),
};

/** Return the locale directory names under `public/locales`, unsorted. */
function listLocaleDirs(): string[] {
  return fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

/** Files found by the walk, plus the paths it could not inspect. */
type FtlWalkResult = {
  readonly files: readonly string[];
  readonly failures: readonly LocaleFailure[];
};

/**
 * Collect every `.ftl` file under one locale, including nested namespaces.
 *
 * A path that disappears or cannot be inspected is recorded as a read failure
 * and skipped, so one unreadable directory does not hide the rest of the tree.
 */
function listFtlFiles(locale: string, fileSystem: LocaleFileSystem): FtlWalkResult {
  const startDir = path.join(LOCALES_DIR, locale);
  const queue = [startDir];
  const files: string[] = [];
  const failures: LocaleFailure[] = [];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;

    let stats: FileStats;
    try {
      stats = fileSystem.stat(current);
    } catch (error) {
      failures.push({ filePath: current, kind: "read", reason: describeError(error) });
      continue;
    }

    if (stats.isDirectory()) {
      try {
        for (const child of fileSystem.readdir(current)) {
          queue.push(path.join(current, child));
        }
      } catch (error) {
        failures.push({ filePath: current, kind: "read", reason: describeError(error) });
      }
    } else if (stats.isFile() && current.endsWith(".ftl")) {
      files.push(current);
    }
  }

  return { files, failures };
}

/** Collects `$variable` references from a Fluent AST subtree. */
class VariableCollector extends Visitor {
  readonly vars = new Set<string>();

  override visitVariableReference(node: AST.VariableReference): void {
    this.vars.add(node.id.name);
  }
}

/** Add every `$variable` referenced in `node` to the shared `vars` set. */
function collectVariableNames(node: AST.BaseNode | null, vars: Set<string>): void {
  if (!node) return;
  const collector = new VariableCollector();
  collector.visit(node);
  for (const name of collector.vars) {
    vars.add(name);
  }
}

/** Render a caught value as a message without assuming it is an `Error`. */
function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Describe the syntax errors a Fluent resource recorded.
 *
 * `@fluent/syntax` recovers from malformed input instead of throwing: the
 * unusable entries appear in the AST as `Junk` nodes carrying annotations.
 * They must be reported explicitly, otherwise a locale file with a syntax
 * error would be skipped silently and the check would report success.
 *
 * @param entries - Parsed resource body containing at least one `Junk` node.
 * @param source - The original resource text, used to resolve line numbers.
 * @returns One human-readable reason per annotation, or a fallback message.
 */
function describeJunk(entries: readonly AST.Junk[], source: string): string {
  const reasons = entries.flatMap((entry) =>
    entry.annotations.map((annotation) => {
      // Annotations do not always carry a span, and `Span.start` is a
      // character offset; `lineOffset` counts the preceding newlines, so add
      // one to report the human-readable line number.
      const line = annotation.span ? lineOffset(source, annotation.span.start) + 1 : undefined;
      return line === undefined ? annotation.message : `${annotation.message} (line ${line})`;
    }),
  );
  return reasons.length > 0 ? reasons.join("; ") : "unknown syntax error";
}

/** Outcome of parsing one Fluent file, with failures returned as data. */
export type ParseOutcome =
  | { readonly ok: true; readonly resource: Resource }
  | { readonly ok: false; readonly reason: string };

/**
 * Parse one Fluent file without side effects.
 *
 * The parser is a query: it reports a syntax failure in its return value
 * rather than logging or setting `process.exitCode`. Callers decide how to
 * surface the failure, which keeps the CLI boundary the only place that
 * writes to the console or changes the process exit status.
 *
 * @param contents - Raw file text.
 * @returns The parsed resource, or the reason it is unusable.
 *
 * @example
 * ```ts
 * const outcome = parseResource("hello = Hello { $name }\n");
 * if (!outcome.ok) console.error(outcome.reason);
 * ```
 */
export function parseResource(contents: string): ParseOutcome {
  let resource: Resource;
  try {
    resource = parse(contents, {});
  } catch (error) {
    return { ok: false, reason: describeError(error) };
  }

  const junk = resource.body.filter((entry): entry is AST.Junk => entry.type === "Junk");
  if (junk.length > 0) {
    return { ok: false, reason: describeJunk(junk, contents) };
  }

  return { ok: true, resource };
}

/** Report whether an entry opts out via the `vars: ignore-mismatch` marker. */
function shouldIgnoreEntry(entry: { comment?: { content?: string } | null }): boolean {
  const comment = entry.comment?.content ?? "";
  return comment.includes(IGNORE_MARKER);
}

/** A path the checker could not read or parse, reported by the CLI boundary. */
export type LocaleFailure = {
  readonly filePath: string;
  readonly kind: "read" | "parse";
  readonly reason: string;
};

/** Placeholders and failures read from one locale directory. */
export type LocaleReadResult = {
  readonly placeholders: Map<string, PlaceholderReport>;
  readonly failures: readonly LocaleFailure[];
};

/**
 * Map each message id in one locale to the placeholders it references.
 *
 * The same message may be split across several files, so variables and the
 * ignore marker accumulate rather than overwrite. Filesystem and syntax
 * failures are returned alongside the placeholders instead of being thrown or
 * logged here, so the caller can report every failure in one place and still
 * validate the files it could read.
 *
 * @param locale - Locale directory name, e.g. `"cy-GB"`.
 * @param fileSystem - Filesystem to read through; defaults to `node:fs`.
 * @returns The accumulated placeholders and every failure encountered.
 *
 * @example
 * ```ts
 * const { placeholders, failures } = readLocalePlaceholders("cy-GB");
 * if (failures.length > 0) console.error(failures[0]?.reason);
 * ```
 */
export function readLocalePlaceholders(
  locale: string,
  fileSystem: LocaleFileSystem = nodeFileSystem,
): LocaleReadResult {
  const { files, failures: walkFailures } = listFtlFiles(locale, fileSystem);
  const placeholders = new Map<string, PlaceholderReport>();
  const failures: LocaleFailure[] = [...walkFailures];

  files.forEach((filePath) => {
    let contents: string;
    try {
      contents = fileSystem.readFile(filePath);
    } catch (error) {
      failures.push({ filePath, kind: "read", reason: describeError(error) });
      return;
    }

    const outcome = parseResource(contents);
    if (!outcome.ok) {
      failures.push({ filePath, kind: "parse", reason: outcome.reason });
      return;
    }

    outcome.resource.body.forEach((entry) => {
      if (entry.type !== "Message" && entry.type !== "Term") return;
      const id = entry.id.name;
      if (!id) return;

      const vars = placeholders.get(id)?.vars ?? new Set<string>();
      collectVariableNames(entry.value, vars);
      entry.attributes.forEach((attr) => collectVariableNames(attr.value, vars));

      const ignore = shouldIgnoreEntry(entry) || placeholders.get(id)?.ignore === true;
      placeholders.set(id, { vars, ignore });
    });
  });

  return { placeholders, failures };
}

type PlaceholderMismatch = {
  locale: string;
  id: string;
  missing: readonly string[];
  extra: readonly string[];
};

/** Compare one locale against the base map and return every divergence. */
function findPlaceholderMismatches(
  locale: string,
  baseMap: ReadonlyMap<string, PlaceholderReport>,
  localeMap: ReadonlyMap<string, PlaceholderReport>,
): PlaceholderMismatch[] {
  const mismatches: PlaceholderMismatch[] = [];

  baseMap.forEach((baseEntry, id) => {
    if (baseEntry.ignore) return;
    const target = localeMap.get(id);
    if (!target || target.ignore) return;

    const missing = [...baseEntry.vars].filter((name) => !target.vars.has(name));
    const extra = [...target.vars].filter((name) => !baseEntry.vars.has(name));

    if (missing.length > 0 || extra.length > 0) {
      mismatches.push({ locale, id, missing, extra });
    }
  });

  return mismatches;
}

/** Print one unreadable or unparseable file with its reason. */
function reportFailure(failure: LocaleFailure): void {
  const action = failure.kind === "parse" ? "parse" : "read";
  console.error(`[ftl-vars] Unable to ${action} ${failure.filePath}: ${failure.reason}`);
}

/** Print one mismatch, naming the missing and extra placeholders. */
function reportMismatch(mismatch: PlaceholderMismatch): void {
  console.error(
    `[ftl-vars] ${mismatch.locale}:${mismatch.id} placeholder mismatch vs ${BASE_LOCALE}`,
  );
  if (mismatch.missing.length > 0) {
    console.error(`  missing: ${mismatch.missing.map((name) => `$${name}`).join(", ")}`);
  }
  if (mismatch.extra.length > 0) {
    console.error(`  extra:   ${mismatch.extra.map((name) => `$${name}`).join(", ")}`);
  }
}

/** Validate every locale against the base locale and exit non-zero on drift. */
function runCheck(): void {
  if (!fs.existsSync(LOCALES_DIR)) {
    console.error(`[ftl-vars] No locales directory at ${LOCALES_DIR}`);
    process.exit(1);
  }

  const locales = listLocaleDirs();
  if (!locales.includes(BASE_LOCALE)) {
    console.error(`[ftl-vars] Base locale "${BASE_LOCALE}" not found under public/locales`);
    process.exit(1);
  }

  const base = readLocalePlaceholders(BASE_LOCALE);
  const comparisonLocales = locales.filter((locale) => locale !== BASE_LOCALE);
  const comparison = comparisonLocales.map((locale) => ({
    locale,
    ...readLocalePlaceholders(locale),
  }));

  const failures = [base.failures, ...comparison.map((entry) => entry.failures)].flat();
  for (const failure of failures) {
    reportFailure(failure);
  }

  const mismatches = comparison.flatMap((entry) =>
    findPlaceholderMismatches(entry.locale, base.placeholders, entry.placeholders),
  );
  for (const mismatch of mismatches) {
    reportMismatch(mismatch);
  }

  if (failures.length > 0 || mismatches.length > 0) {
    console.error("[ftl-vars] Placeholder validation failed");
    process.exit(1);
  } else {
    console.log("[ftl-vars] All Fluent placeholders align across locales");
  }
}

/**
 * CLI boundary: report anything the checker did not anticipate as data.
 *
 * The walk and reads surface expected failures in their return values. This
 * catch only covers the unforeseen, such as the locales directory becoming
 * unreadable between the existence check and the listing, so the gate still
 * fails with a diagnostic instead of a stack trace.
 */
function main(): void {
  try {
    runCheck();
  } catch (error) {
    console.error(`[ftl-vars] Unexpected failure: ${describeError(error)}`);
    process.exitCode = 1;
  }
}

// Importing this module for its pure helpers must not run the CLI. Bun sets
// `import.meta.main` only for the entry point, so tests can exercise the
// parser without spawning a process or mutating the test runner's exit code.
if (import.meta.main) {
  main();
}
