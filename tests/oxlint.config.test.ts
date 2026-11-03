/**
 * @file Contract tests for the Oxlint configuration.
 *
 * Guards the decisions recorded in ADR 012: the plugins stay pinned, every
 * published Deslop rule is configured at the intended severity, and the one
 * deliberate conflict is resolved in Unicorn's favour. Fixture tests then
 * prove the committed `oxlint` command actually reports the configured rules.
 */

import { describe, expect, it } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { recommendedRules } from "ai-deslop";
import * as v from "valibot";

const CONFIG_PATH = ".oxlintrc.json";
const PACKAGE_PATH = "package.json";
const REPO_ROOT = path.resolve(import.meta.dir, "..");

// Opt-in rules adopted alongside the plugin's recommended profile. The list
// mirrors `docs/` in `ai-deslop` 0.4.9; `canonical-class-names` is deliberately
// excluded because it rewrites Tailwind class spellings across the application.
const ADOPTED_OPT_IN_RULES = [
  "deslop/no-duplicate-consts",
  "deslop/no-duplicate-types",
  "deslop/no-pass-through-schema",
  "deslop/no-renamed-imports",
  "deslop/no-reexports-outside-entrypoints",
] as const;

// The recommended profile publishes every rule as an error, except this one,
// which Unicorn's equivalent replaces.
const DELIBERATELY_DISABLED_RULE = "deslop/no-reflect-apply";

// Modules allowed to re-export symbols; everything else must import directly.
const RE_EXPORT_ENTRYPOINTS = ["**/index.ts", "src/i18n.ts", "src/global.d.ts"];

const PINNED_PACKAGES = ["oxlint", "oxlint-tsgolint", "ai-deslop"] as const;

const EXACT_VERSION = /^\d+\.\d+\.\d+$/;

const RuleSettingSchema = v.union([v.string(), v.array(v.unknown())]);

const OxlintConfigSchema = v.object({
  jsPlugins: v.array(v.string()),
  plugins: v.array(v.string()),
  categories: v.record(v.string(), v.string()),
  rules: v.record(v.string(), RuleSettingSchema),
});

const PackageSchema = v.object({
  devDependencies: v.record(v.string(), v.string()),
});

type OxlintConfig = v.InferOutput<typeof OxlintConfigSchema>;
type RuleSetting = OxlintConfig["rules"][string];

type LintFixture = {
  name: string;
  source: string;
};

/** Read and validate the Oxlint configuration. */
async function readConfig(): Promise<OxlintConfig> {
  return v.parse(OxlintConfigSchema, await Bun.file(CONFIG_PATH).json());
}

/** Return the severity string for a rule, whether plain or in tuple form. */
function severityOf(setting: RuleSetting | undefined): string {
  if (Array.isArray(setting)) return String(setting[0]);
  return setting ?? "unconfigured";
}

/** Return the rules configured at the `error` severity. */
function errorRules(config: OxlintConfig): string[] {
  return Object.entries(config.rules)
    .filter(([, setting]) => severityOf(setting) === "error")
    .map(([rule]) => rule);
}

/**
 * Run the committed `oxlint` command with temporary fixtures at the
 * repository root, so the test observes the same rule set the `lint` gate
 * applies without depending on Biome's formatting verdict.
 */
function lintFixtures(fixtures: readonly LintFixture[]) {
  const paths = fixtures.map(({ name, source }) => {
    const fixturePath = path.join(REPO_ROOT, name);
    writeFileSync(fixturePath, source);
    return fixturePath;
  });

  try {
    const result = Bun.spawnSync([process.execPath, "run", "oxlint"], {
      cwd: REPO_ROOT,
      env: { ...process.env },
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: result.exitCode,
      output: `${result.stdout.toString()}${result.stderr.toString()}`,
    };
  } finally {
    for (const fixturePath of paths) rmSync(fixturePath, { force: true });
  }
}

describe("Oxlint plugin wiring", () => {
  it("loads the Deslop JavaScript plugin and the Unicorn built-in plugin", async () => {
    const config = await readConfig();

    expect(config.jsPlugins).toContain("ai-deslop");
    expect(config.plugins).toContain("unicorn");
  });

  it("keeps every category disabled so the explicit rule list is authoritative", async () => {
    const config = await readConfig();

    for (const severity of Object.values(config.categories)) {
      expect(severity).toBe("off");
    }
  });
});

describe("Deslop rule coverage", () => {
  it("configures every rule in the plugin's recommended profile as an error", async () => {
    const config = await readConfig();
    const recommended = Object.keys(recommendedRules)
      .filter((rule) => rule.startsWith("deslop/"))
      .filter((rule) => rule !== DELIBERATELY_DISABLED_RULE);

    expect(recommended.filter((rule) => severityOf(config.rules[rule]) !== "error")).toEqual([]);
  });

  it("configures every adopted opt-in rule as an error", async () => {
    const config = await readConfig();

    for (const rule of ADOPTED_OPT_IN_RULES) {
      expect(severityOf(config.rules[rule])).toBe("error");
    }
  });

  it("restricts re-exports to the declared entrypoints", async () => {
    const config = await readConfig();
    const setting = config.rules["deslop/no-reexports-outside-entrypoints"];

    expect(Array.isArray(setting)).toBe(true);
    expect(setting).toEqual(["error", { entrypoints: RE_EXPORT_ENTRYPOINTS }]);
  });

  it("disables no-reflect-apply so unicorn/prefer-reflect-apply wins", async () => {
    const config = await readConfig();

    expect(severityOf(config.rules["unicorn/prefer-reflect-apply"])).toBe("error");
    expect(severityOf(config.rules[DELIBERATELY_DISABLED_RULE])).toBe("off");
    expect(errorRules(config)).not.toContain(DELIBERATELY_DISABLED_RULE);
  });
});

describe("committed oxlint command", () => {
  it("fails and names the rule when a source file violates it", () => {
    const fixtureName = `lint-fixture-${process.pid}-unicorn.ts`;
    const { exitCode, output } = lintFixtures([
      {
        name: fixtureName,
        source: "export function lintFixture(): never {\n  throw new Error();\n}\n",
      },
    ]);

    expect(exitCode).not.toBe(0);
    expect(output).toContain("unicorn(error-message)");
    expect(output).toContain(fixtureName);
  }, 180_000);

  it("reports an adopted opt-in rule through the committed oxlint command", () => {
    const fixtureName = `lint-fixture-${process.pid}-deslop.ts`;
    const { exitCode, output } = lintFixtures([
      {
        name: fixtureName,
        source:
          'import { readFileSync as readFixture } from "node:fs";\n' +
          "export const fixture = readFixture;\n",
      },
    ]);

    expect(exitCode).not.toBe(0);
    expect(output).toContain("deslop(no-renamed-imports)");
    expect(output).toContain(fixtureName);
  }, 180_000);
});

describe("pinned tooling versions", () => {
  it("pins the Oxlint toolchain and the Deslop plugin to exact versions", async () => {
    const manifest = v.parse(PackageSchema, await Bun.file(PACKAGE_PATH).json());

    for (const name of PINNED_PACKAGES) {
      const version = manifest.devDependencies[name];
      expect(version).toBeDefined();
      expect(version ?? "").toMatch(EXACT_VERSION);
    }
  });
});
