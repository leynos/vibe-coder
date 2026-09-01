/**
 * @file Tests the repository-owned GitHub Actions runner assignments.
 *
 * The workflow files are declarative infrastructure. Parsing them in the
 * ordinary Bun test suite prevents a valid-but-wrong hosted runner or missing
 * actionlint label from silently undoing the Namespace migration.
 */

import { describe, expect, it } from "bun:test";
import * as v from "valibot";

const NAMESPACE_RUNNER = "namespace-profile-default";

const WorkflowSchema = v.object({
  jobs: v.record(v.string(), v.object({ "runs-on": v.optional(v.string()) })),
});

const ActionlintSchema = v.object({
  "self-hosted-runner": v.object({ labels: v.array(v.string()) }),
});

describe("Namespace runner workflow contracts", () => {
  it("assigns the Pages build, Pages deployment, and semantic lint jobs to Namespace", async () => {
    await expectJobRunner(".github/workflows/deploy.yml", "build");
    await expectJobRunner(".github/workflows/deploy.yml", "deploy");
    await expectJobRunner(".github/workflows/semantic-lint.yml", "lint");
  });

  it("declares every Namespace runner label used by repository workflows", async () => {
    const actionlint = v.parse(
      ActionlintSchema,
      Bun.YAML.parse(await Bun.file(".github/actionlint.yaml").text()),
    );

    expect(actionlint["self-hosted-runner"].labels).toEqual([
      NAMESPACE_RUNNER,
      `${NAMESPACE_RUNNER}-arm64`,
    ]);
  });
});

/**
 * Assert that one repository-owned workflow job uses the shared Linux profile.
 *
 * @param workflowPath - Repository-relative YAML workflow path.
 * @param jobName - Name of the job whose runner is part of the contract.
 */
async function expectJobRunner(workflowPath: string, jobName: string): Promise<void> {
  const workflow = v.parse(WorkflowSchema, Bun.YAML.parse(await Bun.file(workflowPath).text()));

  expect(workflow.jobs[jobName]?.["runs-on"]).toBe(NAMESPACE_RUNNER);
}
