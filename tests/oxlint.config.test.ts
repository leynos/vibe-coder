/**
 * @file Contract tests for the Oxlint configuration.
 *
 * Guards the decisions recorded in ADR 012: the plugins stay pinned, every
 * published Deslop rule is configured, and the one deliberate conflict is
 * resolved in Unicorn's favour.
 */

import { describe, expect, it } from "bun:test";
import { recommendedRules } from "ai-deslop";
import * as v from "valibot";

const CONFIG_PATH = ".oxlintrc.json";
const PACKAGE_PATH = "package.json";

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

/** Read and validate the Oxlint configuration. */
async function readConfig(): Promise<OxlintConfig> {
  return v.parse(OxlintConfigSchema, await Bun.file(CONFIG_PATH).json());
}

/** Return the severity string for a rule, whether plain or in tuple form. */
function severityOf(setting: string | unknown[]): string {
  return Array.isArray(setting) ? String(setting[0]) : setting;
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
  it("configures every rule in the plugin's recommended profile", async () => {
    const config = await readConfig();
    const missing = Object.keys(recommendedRules)
      .filter((rule) => rule.startsWith("deslop/"))
      .filter((rule) => config.rules[rule] === undefined);

    expect(missing).toEqual([]);
  });

  it("configures every adopted opt-in rule", async () => {
    const config = await readConfig();

    for (const rule of ADOPTED_OPT_IN_RULES) {
      expect(config.rules[rule]).toBeDefined();
    }
  });

  it("disables no-reflect-apply so unicorn/prefer-reflect-apply wins", async () => {
    const config = await readConfig();

    expect(severityOf(config.rules["unicorn/prefer-reflect-apply"] ?? "")).toBe("error");
    expect(severityOf(config.rules["deslop/no-reflect-apply"] ?? "")).toBe("off");
  });
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
