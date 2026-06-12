/** @file Pure import-boundary checks for Vibe Coder's hexagonal layers. */

import { dirname, isAbsolute, join, resolve } from "node:path";

import ts from "typescript";

import {
  expandPathAlias,
  getBasePath,
  getScriptKind,
  normalizeForComparison,
  SOURCE_EXTENSIONS,
} from "./import-boundary-paths";

/**
 * Architectural layer assigned to a repository source file.
 *
 * - `"domain"` - pure business logic under `src/domain/`
 * - `"application"` - use-case orchestration under `src/application/`
 * - `"adapters"` - infrastructure adapters under `src/adapters/`
 * - `"app"` - Next.js / React app shell under `src/app/`
 * - `"other"` - any path outside the four guarded layers
 */
export type SourceLayer = "domain" | "application" | "adapters" | "app" | "other";

/**
 * A source file supplied to the boundary checker.
 *
 * @property path - Repository-relative path to the file (e.g. `"src/domain/model.ts"`),
 *   or an absolute path when {@link BoundaryCheckOptions.basePath} is supplied
 *   so the checker can normalize it to a repository-relative path.
 * @property sourceText - UTF-8 source text of the file.
 */
export interface SourceFileInput {
  readonly path: string;
  readonly sourceText: string;
}

/**
 * A single import-direction violation emitted by `findBoundaryViolations`.
 *
 * @property sourcePath - Repository-relative path of the file that contains the violation.
 * @property importPath - The raw module specifier as written in the source.
 * @property line - 1-based line number of the offending import statement.
 * @property column - 1-based column number of the offending import statement.
 * @property message - Human-readable description of the violated boundary rule.
 */
export interface BoundaryViolation {
  readonly sourcePath: string;
  readonly importPath: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

/**
 * Optional configuration for `classifySourcePath` and `findBoundaryViolations`.
 *
 * @property basePath - Absolute repository path used to normalize absolute
 *   {@link SourceFileInput.path} values into repository-relative paths. Callers
 *   must supply {@link BoundaryCheckOptions.basePath} when passing absolute
 *   source paths.
 */
export interface BoundaryCheckOptions {
  readonly basePath?: string;
}

interface ImportReference {
  readonly importPath: string;
  readonly line: number;
  readonly column: number;
}

export const DISALLOWED_DOMAIN_PACKAGES = new Map<string, string>([
  ["react", "domain files must not import React"],
  ["react-dom", "domain files must not import React DOM"],
  ["dexie", "domain files must not import Dexie"],
]);

export const DISALLOWED_APPLICATION_PACKAGES = new Map<string, string>([
  ["react", "application files must not import React"],
  ["react-dom", "application files must not import React DOM"],
  ["dexie", "application files must not import Dexie"],
]);

const NON_LITERAL_DYNAMIC_IMPORT = "__NON_LITERAL_DYNAMIC_IMPORT__";

const LAYER_ROOTS: ReadonlyArray<readonly [SourceLayer, string]> = [
  ["domain", "src/domain"],
  ["application", "src/application"],
  ["adapters", "src/adapters"],
  ["app", "src/app"],
];

/**
 * Classify a repository path into the architectural layer it belongs to.
 *
 * @example
 * ```ts
 * // example only
 * classifySourcePath("src/domain/user.ts", { basePath: "/repo" }); // "domain"
 * classifySourcePath("src/adapters/http.ts", { basePath: "/repo" }); // "adapters"
 * classifySourcePath("scripts/build.ts", { basePath: "/repo" }); // "other"
 * ```
 */
export function classifySourcePath(path: string, options: BoundaryCheckOptions = {}): SourceLayer {
  const normalizedPath = normalizeForComparison(path, getBasePath(options));

  for (const [layer, root] of LAYER_ROOTS) {
    if (normalizedPath === root || normalizedPath.startsWith(`${root}/`)) {
      return layer;
    }
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
 *   findBoundaryViolations(files, { basePath: "/repo" });
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
  options: BoundaryCheckOptions = {},
): ReadonlyArray<BoundaryViolation> {
  const basePath = getBasePath(options);
  const sourcePathSet = new Set(files.map((file) => normalizeForComparison(file.path, basePath)));
  const violations: BoundaryViolation[] = [];

  for (const file of files) {
    const sourcePath = normalizeForComparison(file.path, basePath);
    const sourceLayer = classifySourcePath(sourcePath, getOptionsForBasePath(basePath));

    if (sourceLayer === "other") {
      continue;
    }

    for (const reference of extractImportReferences(file)) {
      const message = describeViolation(
        sourcePath,
        sourceLayer,
        reference.importPath,
        sourcePathSet,
        basePath,
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

/** Describe the first boundary rule violated by one import reference. */
function describeViolation(
  sourcePath: string,
  sourceLayer: SourceLayer,
  importPath: string,
  sourcePathSet: ReadonlySet<string>,
  basePath: string | undefined,
): string | null {
  if (
    importPath === NON_LITERAL_DYNAMIC_IMPORT &&
    (sourceLayer === "domain" || sourceLayer === "application")
  ) {
    return `${sourceLayer} files must not use non-literal dynamic imports`;
  }

  const importedLayer = classifyImportTarget(sourcePath, importPath, sourcePathSet, basePath);

  if (sourceLayer === "domain") {
    return describeDomainViolation(importPath, importedLayer);
  }

  if (sourceLayer === "application") {
    return describeApplicationViolation(importPath, importedLayer);
  }

  if (sourceLayer === "adapters") {
    return describeAdapterViolation(importedLayer);
  }

  return null;
}

/** Describe why a domain import crosses a forbidden boundary. */
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

/** Describe why an application import crosses a forbidden boundary. */
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

/** Describe why an adapter import crosses a forbidden boundary. */
function describeAdapterViolation(importedLayer: SourceLayer): string | null {
  if (importedLayer === "app") {
    return "adapter files must not import app shell files";
  }

  return null;
}

/** Return the package-level violation message for a disallowed dependency. */
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

/** Classify the architectural layer targeted by an import specifier. */
function classifyImportTarget(
  sourcePath: string,
  importPath: string,
  sourcePathSet: ReadonlySet<string>,
  basePath: string | undefined,
): SourceLayer {
  const expandedAlias = expandPathAlias(importPath);
  if (expandedAlias) {
    return classifySourcePath(expandedAlias, getOptionsForBasePath(basePath));
  }

  if (importPath.startsWith(".")) {
    return classifySourcePath(
      resolveRelativeImport(sourcePath, importPath, sourcePathSet, basePath),
      getOptionsForBasePath(basePath),
    );
  }

  if (importPath.startsWith("src/")) {
    return classifySourcePath(importPath, getOptionsForBasePath(basePath));
  }

  return "other";
}

/** Resolve a relative import to a repository-normalized source path. */
function resolveRelativeImport(
  sourcePath: string,
  importPath: string,
  sourcePathSet: ReadonlySet<string>,
  basePath: string | undefined,
): string {
  const sourceDirectory = isAbsolute(sourcePath)
    ? dirname(sourcePath)
    : basePath
      ? resolve(basePath, dirname(sourcePath))
      : dirname(sourcePath);
  const candidate = normalizeForComparison(join(sourceDirectory, importPath), basePath);

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

/** Build options without assigning explicit `undefined` to an optional key. */
function getOptionsForBasePath(basePath: string | undefined): BoundaryCheckOptions {
  return basePath === undefined ? {} : { basePath };
}

/** Extract import-like references from a TypeScript or JavaScript source file. */
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

/** Return an import specifier from static, dynamic, export, or import-type nodes. */
function getImportPath(node: ts.Node): string | null {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    const moduleSpecifier = node.moduleSpecifier;
    return moduleSpecifier ? getLiteralModuleSpecifier(moduleSpecifier) : null;
  }

  if (ts.isImportTypeNode(node)) {
    return getImportTypePath(node);
  }

  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const [moduleSpecifier] = node.arguments;
    const importPath = moduleSpecifier ? getLiteralModuleSpecifier(moduleSpecifier) : null;
    return importPath ?? NON_LITERAL_DYNAMIC_IMPORT;
  }

  return null;
}

/** Return the literal module path from an `import("...")` type query. */
function getImportTypePath(node: ts.ImportTypeNode): string | null {
  const argument = node.argument;
  if (!ts.isLiteralTypeNode(argument)) {
    return null;
  }

  return getLiteralModuleSpecifier(argument.literal);
}

/** Return text from string and no-substitution template module specifiers. */
function getLiteralModuleSpecifier(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return null;
}
