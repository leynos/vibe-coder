/** @file Pure import-boundary checks for Vibe Coder's hexagonal layers. */

import { dirname, isAbsolute, normalize, relative, resolve, sep } from "node:path";

import ts from "typescript";

export type SourceLayer = "domain" | "application" | "adapters" | "app" | "other";

export interface SourceFileInput {
  readonly path: string;
  readonly sourceText: string;
}

export interface BoundaryViolation {
  readonly sourcePath: string;
  readonly importPath: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

interface ImportReference {
  readonly importPath: string;
  readonly line: number;
  readonly column: number;
}

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"] as const;

const DISALLOWED_DOMAIN_PACKAGES = new Map<string, string>([
  ["react", "domain files must not import React"],
  ["react-dom", "domain files must not import React DOM"],
  ["dexie", "domain files must not import Dexie"],
]);

const DISALLOWED_APPLICATION_PACKAGES = new Map<string, string>([
  ["react-dom", "application files must not import React DOM"],
  ["dexie", "application files must not import Dexie"],
]);

const NON_LITERAL_DYNAMIC_IMPORT = "__NON_LITERAL_DYNAMIC_IMPORT__";

/**
 * Classify a repository path into the architectural layer it belongs to.
 *
 * @example
 * ```ts
 * // example only
 * classifySourcePath("src/domain/user.ts"); // "domain"
 * classifySourcePath("src/adapters/http.ts"); // "adapters"
 * classifySourcePath("scripts/build.ts"); // "other"
 * ```
 */
export function classifySourcePath(path: string): SourceLayer {
  const normalizedPath = normalizeForComparison(path);

  if (normalizedPath.startsWith("src/domain/")) {
    return "domain";
  }
  if (normalizedPath.startsWith("src/application/")) {
    return "application";
  }
  if (normalizedPath.startsWith("src/adapters/")) {
    return "adapters";
  }
  if (normalizedPath.startsWith("src/app/")) {
    return "app";
  }

  return "other";
}

/**
 * Return every import-direction violation found in the supplied source files.
 *
 * @example
 * ```ts
 * // example only
 * const files: ReadonlyArray<SourceFileInput> = [
 *   { path: "src/domain/user.ts", sourceText: "export const user = {};" },
 *   {
 *     path: "src/domain/load.ts",
 *     sourceText: 'import "../adapters/http";',
 *   },
 *   { path: "src/adapters/http.ts", sourceText: "export const http = {};" },
 * ];
 *
 * const violations: ReadonlyArray<BoundaryViolation> =
 *   findBoundaryViolations(files);
 * // [{
 * //   sourcePath: "src/domain/load.ts",
 * //   importPath: "../adapters/http",
 * //   line: 1,
 * //   column: 1,
 * //   message: "domain files must not import adapter files",
 * // }]
 * ```
 */
export function findBoundaryViolations(
  files: ReadonlyArray<SourceFileInput>,
): ReadonlyArray<BoundaryViolation> {
  const sourcePathSet = new Set(files.map((file) => normalizeForComparison(file.path)));
  const violations: BoundaryViolation[] = [];

  for (const file of files) {
    const sourcePath = normalizeForComparison(file.path);
    const sourceLayer = classifySourcePath(sourcePath);

    if (sourceLayer === "other") {
      continue;
    }

    for (const reference of extractImportReferences(file)) {
      const message = describeViolation(
        sourcePath,
        sourceLayer,
        reference.importPath,
        sourcePathSet,
      );

      if (message) {
        violations.push({
          sourcePath,
          importPath: reference.importPath,
          line: reference.line,
          column: reference.column,
          message,
        });
      }
    }
  }

  return violations;
}

function describeViolation(
  sourcePath: string,
  sourceLayer: SourceLayer,
  importPath: string,
  sourcePathSet: ReadonlySet<string>,
): string | null {
  if (
    importPath === NON_LITERAL_DYNAMIC_IMPORT &&
    (sourceLayer === "domain" || sourceLayer === "application")
  ) {
    return `${sourceLayer} files must not use non-literal dynamic imports`;
  }

  const importedLayer = classifyImportTarget(sourcePath, importPath, sourcePathSet);

  if (sourceLayer === "domain") {
    return describeDomainViolation(importPath, importedLayer);
  }

  if (sourceLayer === "application") {
    return describeApplicationViolation(importPath, importedLayer);
  }

  return null;
}

function describeDomainViolation(importPath: string, importedLayer: SourceLayer): string | null {
  if (importedLayer === "application") {
    return "domain files must not import application files";
  }
  if (importedLayer === "adapters") {
    return "domain files must not import adapter files";
  }
  if (importedLayer === "app") {
    return "domain files must not import app shell files";
  }

  return getPackageViolation(importPath, DISALLOWED_DOMAIN_PACKAGES);
}

function describeApplicationViolation(
  importPath: string,
  importedLayer: SourceLayer,
): string | null {
  if (importedLayer === "adapters") {
    return "application files must not import adapter files";
  }
  if (importedLayer === "app") {
    return "application files must not import app shell files";
  }

  return getPackageViolation(importPath, DISALLOWED_APPLICATION_PACKAGES);
}

function getPackageViolation(
  importPath: string,
  disallowedPackages: ReadonlyMap<string, string>,
): string | null {
  for (const [packageName, message] of disallowedPackages) {
    if (importPath === packageName || importPath.startsWith(`${packageName}/`)) {
      return message;
    }
  }

  return null;
}

function classifyImportTarget(
  sourcePath: string,
  importPath: string,
  sourcePathSet: ReadonlySet<string>,
): SourceLayer {
  if (importPath.startsWith(".")) {
    return classifySourcePath(resolveRelativeImport(sourcePath, importPath, sourcePathSet));
  }

  if (importPath.startsWith("src/")) {
    return classifySourcePath(importPath);
  }

  return "other";
}

function resolveRelativeImport(
  sourcePath: string,
  importPath: string,
  sourcePathSet: ReadonlySet<string>,
): string {
  const candidate = normalizeForComparison(resolve(dirname(sourcePath), importPath));

  if (sourcePathSet.has(candidate)) {
    return candidate;
  }

  for (const extension of SOURCE_EXTENSIONS) {
    const withExtension = `${candidate}${extension}`;
    if (sourcePathSet.has(withExtension)) {
      return withExtension;
    }
  }

  for (const extension of SOURCE_EXTENSIONS) {
    const indexPath = `${candidate}/index${extension}`;
    if (sourcePathSet.has(indexPath)) {
      return indexPath;
    }
  }

  return candidate;
}

function extractImportReferences(file: SourceFileInput): ReadonlyArray<ImportReference> {
  const source = ts.createSourceFile(
    file.path,
    file.sourceText,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(file.path),
  );
  const references: ImportReference[] = [];

  const addReference = (node: ts.Node, importPath: string): void => {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    references.push({
      importPath,
      line: line + 1,
      column: character + 1,
    });
  };

  const visit = (node: ts.Node): void => {
    const importPath = getImportPath(node);

    if (importPath) {
      addReference(node, importPath);
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return references;
}

function getImportPath(node: ts.Node): string | null {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    const moduleSpecifier = node.moduleSpecifier;
    return moduleSpecifier && ts.isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : null;
  }

  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const [moduleSpecifier] = node.arguments;
    return moduleSpecifier && ts.isStringLiteral(moduleSpecifier)
      ? moduleSpecifier.text
      : NON_LITERAL_DYNAMIC_IMPORT;
  }

  return null;
}

function getScriptKind(path: string): ts.ScriptKind {
  return path.endsWith(".tsx") || path.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function normalizeForComparison(path: string): string {
  const repositoryPath = isAbsolute(path) ? relative(process.cwd(), path) : path;
  return normalize(repositoryPath).split(sep).join("/");
}
