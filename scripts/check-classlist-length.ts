/**
 * @file Semantic lint: enforce a maximum `className` length in TSX sources.
 *
 * Scans every TSX source under `src` for string-literal `className` values
 * and fails when any exceeds the threshold in `tools/semantic-lint.config.json`
 * (16 by default). Long class lists are a readability smell that more often
 * belongs in a named utility or component variant.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import * as v from "valibot";

import { SEMANTIC_LINT_CONFIG_PATH } from "./semantic-lint-config";

const MAX_CLASSLIST_LENGTH = v.pipe(v.number(), v.finite(), v.minValue(1));

const SemanticConfigSchema = v.object({
  maxClasslistLength: v.optional(MAX_CLASSLIST_LENGTH),
});

interface Violation {
  file: string;
  line: number;
  column: number;
  length: number;
}

const PROJECT_ROOT = process.cwd();

function loadThreshold(): number {
  const raw = readFileSync(SEMANTIC_LINT_CONFIG_PATH, "utf8");
  const config = v.parse(SemanticConfigSchema, JSON.parse(raw));
  return config.maxClasslistLength === undefined ? 16 : Math.floor(config.maxClasslistLength);
}

function getTsxFiles(): string[] {
  const glob = new Bun.Glob("src/**/*.tsx");
  return [...glob.scanSync(PROJECT_ROOT)];
}

function extractStringLiteral(initializer: ts.JsxAttributeValue): string | null {
  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    const expression = initializer.expression;
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      return expression.text;
    }
  }
  return null;
}

function analyseFile(filePath: string, maxLength: number, results: Violation[]): void {
  const sourceText = readFileSync(filePath, "utf8");
  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && node.name.text === "className" && node.initializer) {
      const literal = extractStringLiteral(node.initializer);
      if (literal) {
        const count = literal.trim().split(/\s+/u).filter(Boolean).length;
        if (count > maxLength) {
          const { line, character } = source.getLineAndCharacterOfPosition(node.getStart());
          results.push({
            file: filePath,
            line: line + 1,
            column: character + 1,
            length: count,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
}

function main(): void {
  const maxLength = loadThreshold();
  const violations: Violation[] = [];

  for (const file of getTsxFiles()) {
    analyseFile(file, maxLength, violations);
  }

  for (const violation of violations) {
    const displayPath = path.relative(PROJECT_ROOT, violation.file);
    console.error(
      `${displayPath}:${violation.line}:${violation.column} className has ${violation.length} utilities (max ${maxLength}).`,
    );
  }

  if (violations.length > 0) {
    process.exitCode = 1;
  }
}

main();
