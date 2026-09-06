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

const WorkflowSchema = v.object({
  jobs: v.record(
    v.string(),
    v.object({ "runs-on": v.optional(v.string()), uses: v.optional(v.string()) }),
  ),
});

describe("Workflow runner contracts", () => {
  it("runs the Pages build, Pages deployment, and semantic lint jobs on the hosted runner", async () => {
    await expectJobRunner(`${WORKFLOW_DIRECTORY}/deploy.yml`, "build");
    await expectJobRunner(`${WORKFLOW_DIRECTORY}/deploy.yml`, "deploy");
    await expectJobRunner(`${WORKFLOW_DIRECTORY}/semantic-lint.yml`, "lint");
  });

  it("assigns every job in every workflow to the hosted runner", async () => {
    const workflowFiles = (await readdir(WORKFLOW_DIRECTORY)).filter((name) =>
      /\.ya?ml$/.test(name),
    );

    expect(workflowFiles.length).toBeGreaterThan(0);

    for (const fileName of workflowFiles) {
      const path = `${WORKFLOW_DIRECTORY}/${fileName}`;
      const workflow = v.parse(WorkflowSchema, Bun.YAML.parse(await Bun.file(path).text()));

      for (const [jobName, job] of Object.entries(workflow.jobs)) {
        // A job that calls a reusable workflow chooses no runner of its own;
        // the called workflow owns that decision.
        if (job.uses !== undefined) continue;

        expect(`${path}:${jobName}:${job["runs-on"]}`).toBe(`${path}:${jobName}:${HOSTED_RUNNER}`);
      }
    }
  });

  it("declares no self-hosted runner labels for actionlint", async () => {
    expect(await Bun.file(ACTIONLINT_CONFIG).exists()).toBe(false);
  });
});

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
  const workflow = v.parse(WorkflowSchema, Bun.YAML.parse(await Bun.file(workflowPath).text()));

  expect(workflow.jobs[jobName]?.["runs-on"]).toBe(HOSTED_RUNNER);
}
