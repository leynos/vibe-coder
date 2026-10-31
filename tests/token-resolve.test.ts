/**
 * @file Unit and contract tests for the design-token build.
 *
 * The pure helpers are exercised directly so reference resolution, circular
 * and unknown references, and ordering behaviour are pinned. A contract test
 * then runs the real build twice and asserts that the generated artefacts are
 * complete and byte-for-byte stable.
 */

import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  deriveThemeArtefacts,
  flattenLookup,
  formatCssBlock,
  resolveReferences,
  type TokenValue,
  toFontArray,
  toTitleCase,
  unwrap,
} from "../tokens/build/token-resolve.js";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const BUILD_SCRIPT = path.join(REPO_ROOT, "tokens/build/style-dictionary.js");
const DIST_PATH = path.join(REPO_ROOT, "tokens/dist");
const THEMES_PATH = path.join(REPO_ROOT, "tokens/src/themes");

/** Index an unwrapped token tree, mirroring the build script. */
function indexTokens(tokens: TokenValue): Map<string, TokenValue> {
  const lookup = new Map<string, TokenValue>();
  flattenLookup(tokens, [], lookup);
  return lookup;
}

describe("unwrap", () => {
  it("reduces value nodes to their payload and sorts keys", () => {
    const raw = {
      color: {
        base: { value: "#ffffff" },
        accent: { value: "#3b82f6" },
      },
    };

    expect(unwrap(raw)).toEqual({
      color: { accent: "#3b82f6", base: "#ffffff" },
    });
  });

  it("preserves arrays without reordering them", () => {
    expect(unwrap([{ value: "b" }, { value: "a" }])).toEqual(["b", "a"]);
  });
});

describe("flattenLookup", () => {
  it("indexes leaves by their dotted path", () => {
    const lookup = indexTokens({ color: { primary: { "500": "#111" } }, radius: { md: "4px" } });

    expect(lookup.get("color.primary.500")).toBe("#111");
    expect(lookup.get("radius.md")).toBe("4px");
    expect(lookup.has("color.primary")).toBe(false);
  });
});

describe("resolveReferences", () => {
  it("resolves a reference chain to its literal value", () => {
    const lookup = indexTokens({
      brand: { base: "#123456" },
      semantic: { primary: "{brand.base}" },
      alias: "{semantic.primary}",
    });

    expect(resolveReferences({ alias: "{alias}" }, lookup)).toEqual({ alias: "#123456" });
  });

  it("resolves references inside arrays", () => {
    const lookup = indexTokens({ a: "1", b: "2" });

    expect(resolveReferences(["{a}", "{b}"], lookup)).toEqual(["1", "2"]);
  });

  it("leaves literals and partial references untouched", () => {
    const lookup = indexTokens({ a: "1" });

    expect(resolveReferences({ value: "solid {a} border" }, lookup)).toEqual({
      value: "solid {a} border",
    });
  });

  it("rejects a circular reference and names the cycle", () => {
    const lookup = indexTokens({ a: "{b}", b: "{a}" });

    expect(() => resolveReferences("{a}", lookup)).toThrow(
      "Circular token reference detected: a -> b -> a",
    );
  });

  it("rejects a reference to a token that does not exist", () => {
    const lookup = indexTokens({ a: "1" });

    expect(() => resolveReferences("{missing}", lookup)).toThrow(
      'Unknown token reference "missing"',
    );
  });
});

describe("token formatting helpers", () => {
  it("splits and unquotes a font-family list", () => {
    expect(toFontArray('"Inter", system-ui , sans-serif')).toEqual([
      "Inter",
      "system-ui",
      "sans-serif",
    ]);
    expect(toFontArray()).toEqual([]);
  });

  it("title-cases kebab- and snake-case names", () => {
    expect(toTitleCase("vibe-coder_night")).toBe("Vibe Coder Night");
    expect(toTitleCase("--joined_name")).toBe("Joined Name");
  });

  it("emits declarations in collated order", () => {
    expect(formatCssBlock(":root", { "--b": "2", "--a": "1" })).toBe(
      ":root {\n  --a: 1;\n  --b: 2;\n}\n",
    );
  });
});

describe("deriveThemeArtefacts", () => {
  const meta = {
    name: "sample",
    displayName: "Sample",
    default: true,
    prefersDark: false,
    prefersLight: false,
    colorScheme: "dark",
  };

  it("prefers semantic tokens over the raw colour scale", () => {
    const artefacts = deriveThemeArtefacts(
      meta,
      { bg: { default: "#000000" }, brand: { default: "#123456" } },
      { color: { primary: { "500": "#ffffff", "600": "#eeeeee" } }, radius: { md: "4px" } },
    );

    expect(artefacts.coreVariables["--color-base-100"]).toBe("#000000");
    expect(artefacts.coreVariables["--color-primary"]).toBe("#123456");
    expect(artefacts.coreVariables["--radius-btn"]).toBe("4px");
    expect(artefacts.daisyTheme.colorScheme).toBe("dark");
    expect(artefacts.daisyTheme.default).toBe(true);
  });

  it("falls back to the neutral scale and documented defaults", () => {
    const artefacts = deriveThemeArtefacts(meta, {}, {});

    expect(artefacts.coreVariables["--color-base-100"]).toBe("#ffffff");
    expect(artefacts.coreVariables["--color-base-content"]).toBe("#111111");
    expect(artefacts.coreVariables["--color-primary"]).toBe("#3b82f6");
    expect(artefacts.coreVariables["--radius-box"]).toBe("1rem");
    expect(artefacts.daisyTheme.colorScheme).toBe("dark");
  });

  it("exposes the daisyUI aliases on top of the core variables", () => {
    const artefacts = deriveThemeArtefacts(meta, {}, {});

    expect(artefacts.cssVariables["--p"]).toBe("var(--color-primary)");
    expect(artefacts.cssVariables["--color-primary"]).toBe(
      artefacts.coreVariables["--color-primary"],
    );
  });
});

describe("generated token artefacts", () => {
  /** Run the real build inside a clean working directory. */
  function runBuild(): void {
    const result = Bun.spawnSync([process.execPath, BUILD_SCRIPT], {
      cwd: REPO_ROOT,
      env: { ...process.env },
    });

    if (result.exitCode !== 0) {
      throw new Error(`Token build failed: ${result.stderr.toString()}`);
    }
  }

  function readDist(relativePath: string): string {
    return readFileSync(path.join(DIST_PATH, relativePath), "utf8");
  }

  it("is deterministic and covers every theme in sorted order", () => {
    runBuild();
    const firstCss = readDist("tokens.css");
    const firstTailwind = readDist("tailwind.theme.cjs");

    runBuild();

    expect(readDist("tokens.css")).toBe(firstCss);
    expect(readDist("tailwind.theme.cjs")).toBe(firstTailwind);

    const themeNames = readdirSync(THEMES_PATH)
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) => {
        // SAFETY: theme files are repository-owned JSON; only an optional
        // string `name` is read, and any other shape falls back to the file
        // name.
        const raw = JSON.parse(readFileSync(path.join(THEMES_PATH, fileName), "utf8")) as {
          name?: string;
        };
        return raw.name ?? path.basename(fileName, ".json");
      })
      .toSorted();

    for (const name of themeNames) {
      expect(firstCss).toContain(`[data-theme="${name}"]`);
    }

    const themeNamesMatch = firstTailwind.match(/const themeNames = (\[[^;]*\]);/u);
    expect(themeNamesMatch).not.toBeNull();
    // SAFETY: the generated Tailwind theme file is produced by this
    // repository's build script, whose template emits a JSON array of strings.
    expect(JSON.parse(themeNamesMatch?.[1] ?? "[]") as string[]).toEqual(themeNames);
  });

  it("leaves no unresolved token references in the generated files", () => {
    runBuild();

    expect(readDist("tokens.css")).not.toMatch(/\{[A-Za-z0-9._-]+\}/u);
    expect(readDist("tailwind.theme.cjs")).not.toMatch(/\{[A-Za-z0-9._-]+\}/u);
    expect(
      readDist("tokens.css").startsWith("/* Auto-generated by tokens/build/style-dictionary.js"),
    ).toBe(true);
  });

  it("writes each artefact where the package expects it", () => {
    runBuild();

    for (const relativePath of [
      "tokens.css",
      "tailwind.theme.cjs",
      "tw/preset.js",
      "daisy/theme.js",
      "css/variables.css",
    ]) {
      expect(readFileSync(path.join(DIST_PATH, relativePath), "utf8").length).toBeGreaterThan(0);
    }
  });
});
