#!/usr/bin/env bun
/** @file Ensures Fluent translations keep placeholder parity with the base locale. */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import * as AST from "@fluent/syntax";
import { parse, type Resource, Visitor } from "@fluent/syntax";

type PlaceholderReport = {
  vars: Set<string>;
  ignore: boolean;
};

const BASE_LOCALE = process.env.FTL_BASE_LOCALE ?? "en-GB";
const LOCALES_DIR = path.resolve(process.cwd(), "public/locales");
const IGNORE_MARKER = "vars: ignore-mismatch";

function listLocaleDirs(): string[] {
  return fs
    .readdirSync(LOCALES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function listFtlFiles(locale: string): string[] {
  const startDir = path.join(LOCALES_DIR, locale);
  const queue = [startDir];
  const files: string[] = [];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      const children = fs.readdirSync(current);
      children.forEach((child) => queue.push(path.join(current, child)));
    } else if (stats.isFile() && current.endsWith(".ftl")) {
      files.push(current);
    }
  }
  return files;
}

/** Collects `$variable` references from a Fluent AST subtree. */
class VariableCollector extends Visitor {
  readonly vars = new Set<string>();

  override visitVariableReference(node: AST.VariableReference): void {
    this.vars.add(node.id.name);
  }
}

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

function parseResource(contents: string, filePath: string): Resource | undefined {
  try {
    return parse(contents, {});
  } catch (error) {
    console.error(`[ftl-vars] Unable to parse ${filePath}:`, describeError(error));
    process.exitCode = 1;
    return undefined;
  }
}

function shouldIgnoreEntry(entry: { comment?: { content?: string } | null }): boolean {
  const comment = entry.comment?.content ?? "";
  return comment.includes(IGNORE_MARKER);
}

function readLocalePlaceholders(locale: string): Map<string, PlaceholderReport> {
  const files = listFtlFiles(locale);
  const results = new Map<string, PlaceholderReport>();

  files.forEach((filePath) => {
    const contents = fs.readFileSync(filePath, "utf8");
    const resource = parseResource(contents, filePath);
    if (!resource) return;

    resource.body.forEach((entry) => {
      if (entry.type !== "Message" && entry.type !== "Term") return;
      const id = entry.id.name;
      if (!id) return;

      const vars = results.get(id)?.vars ?? new Set<string>();
      collectVariableNames(entry.value, vars);
      entry.attributes.forEach((attr) => collectVariableNames(attr.value, vars));

      const ignore = shouldIgnoreEntry(entry) || results.get(id)?.ignore === true;
      results.set(id, { vars, ignore });
    });
  });

  return results;
}

type PlaceholderMismatch = {
  locale: string;
  id: string;
  missing: readonly string[];
  extra: readonly string[];
};

function findPlaceholderMismatches(
  locale: string,
  baseMap: ReadonlyMap<string, PlaceholderReport>,
): PlaceholderMismatch[] {
  const localeMap = readLocalePlaceholders(locale);
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

function main(): void {
  if (!fs.existsSync(LOCALES_DIR)) {
    console.error(`[ftl-vars] No locales directory at ${LOCALES_DIR}`);
    process.exit(1);
  }

  const locales = listLocaleDirs();
  if (!locales.includes(BASE_LOCALE)) {
    console.error(`[ftl-vars] Base locale "${BASE_LOCALE}" not found under public/locales`);
    process.exit(1);
  }

  const baseMap = readLocalePlaceholders(BASE_LOCALE);
  const comparisonLocales = locales.filter((locale) => locale !== BASE_LOCALE);
  const mismatches = comparisonLocales.flatMap((locale) =>
    findPlaceholderMismatches(locale, baseMap),
  );

  for (const mismatch of mismatches) {
    reportMismatch(mismatch);
  }

  if (mismatches.length > 0 || process.exitCode) {
    console.error("[ftl-vars] Placeholder validation failed");
    process.exit(1);
  } else {
    console.log("[ftl-vars] All Fluent placeholders align across locales");
  }
}

main();
