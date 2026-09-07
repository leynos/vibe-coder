/**
 * @file Tests that the TypeDoc documentation gate is wired as a real gate.
 *
 * The gate only protects the documented surface if something actually runs it
 * and fails on its exit status. These assertions match the invoked command
 * rather than a step name or target name, so renaming prose cannot satisfy
 * them and deleting the invocation cannot pass unnoticed.
 */

import { describe, expect, it } from "bun:test";
import * as v from "valibot";

const DOCS_CHECK_COMMAND = "bun run docs:check";
const WORKFLOW_PATH = ".github/workflows/semantic-lint.yml";
const TYPEDOC_CONFIG_PATH = "typedoc.json";
const LINT_JOB = "lint";

/**
 * Every validation TypeDoc offers, with the verdict this repository wants.
 *
 * `rewrittenLink` is the sole exception, and it is switched off deliberately.
 * TypeDoc emits that warning from the HTML renderer while resolving page
 * URLs, so under `emit: "none"` it can never fire; leaving it on would claim
 * an enforcement the gate does not perform. The case it describes, a link to
 * a symbol that has no page of its own, is caught in the validation phase by
 * `notExported`.
 */
const EXPECTED_VALIDATION = {
  notDocumented: true,
  notExported: true,
  invalidLink: true,
  invalidPath: true,
  rewrittenLink: false,
  unusedMergeModuleWith: true,
} as const;

/** Every declaration kind the gate requires a JSDoc comment on. */
const REQUIRED_TO_BE_DOCUMENTED = [
  "Enum",
  "EnumMember",
  "Variable",
  "Function",
  "Class",
  "Interface",
  "Property",
  "Method",
  "Accessor",
  "TypeAlias",
] as const;

const WorkflowSchema = v.object({
  jobs: v.record(
    v.string(),
    v.object({
      steps: v.optional(
        v.array(v.object({ run: v.optional(v.string()), if: v.optional(v.string()) })),
      ),
    }),
  ),
});

const PackageSchema = v.object({
  scripts: v.record(v.string(), v.string()),
  devDependencies: v.object({ typedoc: v.string() }),
});

const TypedocSchema = v.object({
  emit: v.string(),
  validation: v.record(v.string(), v.boolean()),
  treatValidationWarningsAsErrors: v.boolean(),
  requiredToBeDocumented: v.array(v.string()),
  blockTags: v.array(v.string()),
});

/** Reads and validates the semantic-lint workflow. */
async function readWorkflow(): Promise<v.InferOutput<typeof WorkflowSchema>> {
  return v.parse(WorkflowSchema, Bun.YAML.parse(await Bun.file(WORKFLOW_PATH).text()));
}

/** Reads and validates `package.json`. */
async function readPackageManifest(): Promise<v.InferOutput<typeof PackageSchema>> {
  return v.parse(PackageSchema, JSON.parse(await Bun.file("package.json").text()));
}

describe("TypeDoc documentation gate wiring", () => {
  it("runs the gate command unconditionally in the semantic-lint job", async () => {
    const workflow = await readWorkflow();
    const lintJob = workflow.jobs[LINT_JOB];

    expect(lintJob).toBeDefined();

    const gateSteps = (lintJob?.steps ?? []).filter(
      (step) => step.run?.trim() === DOCS_CHECK_COMMAND,
    );

    expect(gateSteps).toHaveLength(1);
    // A conditional step is skipped rather than failed, so a gate that carries
    // an `if` is not a gate.
    expect(gateSteps[0]?.if).toBeUndefined();
  });

  it("runs the gate command from the aggregate script and the Makefile target", async () => {
    const manifest = await readPackageManifest();
    const makefile = await Bun.file("Makefile").text();
    const docsCheckRecipe = makefile.match(/^docs-check:\n((?:\t.*\n)+)/m)?.[1];

    expect(manifest.scripts["docs:check"]).toBe("typedoc --options typedoc.json");
    expect(manifest.scripts["test:all"]).toContain(DOCS_CHECK_COMMAND);
    expect(docsCheckRecipe?.split("\n").map((line) => line.trim())).toContain(DOCS_CHECK_COMMAND);
  });

  it("pins typedoc so the gate's verdict is reproducible", async () => {
    const manifest = await readPackageManifest();
    const lockfile = await Bun.file("bun.lock").text();

    expect(manifest.devDependencies.typedoc).toMatch(/^\^?0\.28\./);
    expect(lockfile).toContain('"typedoc": ["typedoc@0.28.20"');
  });

  it("configures TypeDoc to fail on any validation warning and emit nothing", async () => {
    const config = v.parse(TypedocSchema, JSON.parse(await Bun.file(TYPEDOC_CONFIG_PATH).text()));

    expect(config.emit).toBe("none");
    expect(config.treatValidationWarningsAsErrors).toBe(true);
    // Compared as whole sets rather than by spot check: dropping a key would
    // silently restore TypeDoc's own default and weaken the gate.
    expect(config.validation).toEqual(EXPECTED_VALIDATION);
    expect([...config.requiredToBeDocumented].sort()).toEqual(
      [...REQUIRED_TO_BE_DOCUMENTED].sort(),
    );
    // Module headers carry both tags; TypeDoc knows `@module` but has to be
    // told about `@file`, or every barrel header warns.
    expect(config.blockTags).toContain("@file");
    expect(config.blockTags).toContain("@module");
  });
});
