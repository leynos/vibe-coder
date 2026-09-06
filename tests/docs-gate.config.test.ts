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
  devDependencies: v.record(v.string(), v.string()),
});

const TypedocSchema = v.object({
  emit: v.string(),
  validation: v.record(v.string(), v.boolean()),
  treatValidationWarningsAsErrors: v.boolean(),
  requiredToBeDocumented: v.array(v.string()),
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
    const steps = Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);
    const gateSteps = steps.filter((step) => step.run?.trim() === DOCS_CHECK_COMMAND);

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

    expect(manifest.devDependencies["typedoc"]).toBeDefined();
    expect(lockfile).toContain('"typedoc": ["typedoc@0.28.20"');
  });

  it("configures TypeDoc to fail on any validation warning and emit nothing", async () => {
    const config = v.parse(TypedocSchema, JSON.parse(await Bun.file(TYPEDOC_CONFIG_PATH).text()));

    expect(config.emit).toBe("none");
    expect(config.treatValidationWarningsAsErrors).toBe(true);
    // Zero tolerance: every validation TypeDoc offers is switched on, so a
    // future TypeDoc check cannot be silently opted out of one at a time.
    expect(Object.entries(config.validation).filter(([, enabled]) => !enabled)).toEqual([]);
    expect(config.validation["notDocumented"]).toBe(true);
    expect(config.requiredToBeDocumented).toContain("Interface");
  });
});
