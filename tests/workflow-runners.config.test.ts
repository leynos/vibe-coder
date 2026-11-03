/**
 * @file Tests the repository-owned GitHub Actions runner assignments.
 *
 * The workflow files are declarative infrastructure. Parsing them in the
 * ordinary Bun test suite prevents a valid-but-wrong runner label from
 * silently reintroducing a self-hosted provider after the estate settled on
 * GitHub-hosted runners for this repository.
 */

import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import * as v from "valibot";

const HOSTED_RUNNER = "ubuntu-latest";
const WORKFLOW_DIRECTORY = ".github/workflows";
const ACTIONLINT_CONFIG = ".github/actionlint.yaml";

const StepSchema = v.object({
  if: v.optional(v.string()),
  name: v.optional(v.string()),
  run: v.optional(v.string()),
  uses: v.optional(v.string()),
});

const JobSchema = v.object({
  "runs-on": v.optional(v.string()),
  steps: v.optional(v.array(StepSchema)),
  uses: v.optional(v.string()),
});

const WorkflowSchema = v.object({ jobs: v.record(v.string(), JobSchema) });

type Workflow = v.InferOutput<typeof WorkflowSchema>;

describe("Workflow runner contracts", () => {
  it("runs the Pages build, Pages deployment, and semantic lint jobs on the hosted runner", async () => {
    await expectJobRunner(`${WORKFLOW_DIRECTORY}/deploy.yml`, "build");
    await expectJobRunner(`${WORKFLOW_DIRECTORY}/deploy.yml`, "deploy");
    await expectJobRunner(`${WORKFLOW_DIRECTORY}/semantic-lint.yml`, "lint");
  });

  it("assigns every job in every workflow to the hosted runner", async () => {
    const entries = await readdir(WORKFLOW_DIRECTORY);
    const workflowFiles = entries.filter((name) => /\.ya?ml$/.test(name));

    expect(workflowFiles.length).toBeGreaterThan(0);

    for (const fileName of workflowFiles) {
      const path = `${WORKFLOW_DIRECTORY}/${fileName}`;
      const workflow = await readWorkflow(path);

      for (const [jobName, job] of Object.entries(workflow.jobs)) {
        // A job that calls a reusable workflow chooses no runner of its own;
        // the called workflow owns that decision.
        if (job.uses !== undefined) continue;

        expect(`${path}:${jobName}:${job["runs-on"]}`).toBe(`${path}:${jobName}:${HOSTED_RUNNER}`);
      }
    }
  });

  it("runs the committed Oxlint script unconditionally in the lint job", async () => {
    const workflow = await readWorkflow(`${WORKFLOW_DIRECTORY}/semantic-lint.yml`);
    // Destructuring avoids a computed key, which Biome's `useLiteralKeys`
    // flags and `noPropertyAccessFromIndexSignature` forbids as a property.
    const { lint: lintJob } = workflow.jobs;
    const steps = lintJob?.steps ?? [];
    const oxlintSteps = steps.filter(
      (step) => step.run?.trim() === "bun run oxlint" && step.if === undefined,
    );

    // Nothing else in CI runs `make lint`, so a conditional or missing step
    // would let the Unicorn and Deslop rules pass by never running at all.
    expect(oxlintSteps).toHaveLength(1);
  });

  it("declares no self-hosted runner labels for actionlint", async () => {
    expect(await Bun.file(ACTIONLINT_CONFIG).exists()).toBe(false);
  });
});

/**
 * Parse one repository-owned workflow file.
 *
 * @example
 * ```ts
 * const workflow = await readWorkflow(".github/workflows/deploy.yml");
 * // workflow.jobs.build["runs-on"] === "ubuntu-latest"
 * ```
 *
 * @param workflowPath - Repository-relative YAML workflow path.
 * @returns The validated workflow declaration.
 */
async function readWorkflow(workflowPath: string): Promise<Workflow> {
  return v.parse(WorkflowSchema, Bun.YAML.parse(await Bun.file(workflowPath).text()));
}

/**
 * Assert that one repository-owned workflow job uses the hosted Linux runner.
 *
 * @example
 * ```ts
 * await expectJobRunner(".github/workflows/deploy.yml", "build");
 * // Resolves when the job uses ubuntu-latest.
 * ```
 *
 * @param workflowPath - Repository-relative YAML workflow path.
 * @param jobName - Name of the job whose runner is part of the contract.
 */
async function expectJobRunner(workflowPath: string, jobName: string): Promise<void> {
  const workflow = await readWorkflow(workflowPath);

  expect(workflow.jobs[jobName]?.["runs-on"]).toBe(HOSTED_RUNNER);
}
