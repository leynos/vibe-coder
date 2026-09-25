/**
 * @file Tests the pull-request `build-test` job that gates automerge.
 *
 * `build-test` is a required check: it is the only pull-request job that
 * builds the site and runs the test suite, so without it a Dependabot bump
 * that breaks either would be merged by automerge on a green `lint`. The
 * `lint` job runs this file too, so deleting `build-test` fails a check that
 * still runs.
 */

import { describe, expect, it } from "bun:test";
import * as v from "valibot";

const WORKFLOW = ".github/workflows/semantic-lint.yml";
const JOB = "build-test";
const COMMANDS = [
  "bun install --frozen-lockfile",
  "bun run tokens:build",
  "bun run build",
  "bun run test",
];

const StepSchema = v.object({
  run: v.optional(v.string()),
  if: v.optional(v.unknown()),
});

const WorkflowSchema = v.object({
  on: v.optional(v.unknown()),
  true: v.optional(v.unknown()),
  jobs: v.record(
    v.string(),
    v.object({
      if: v.optional(v.unknown()),
      strategy: v.optional(v.unknown()),
      steps: v.optional(v.array(StepSchema)),
    }),
  ),
});

type Workflow = v.InferOutput<typeof WorkflowSchema>;

describe("build-test job contract", () => {
  it("runs on every pull request and on pushes to main", async () => {
    const triggers = readTriggers(await readWorkflow());

    expect(Object.keys(triggers)).toContain("pull_request");
    const push = triggers["push"] as { branches?: string[] } | null | undefined;
    expect(push?.branches ?? []).toContain("main");
  });

  it("is a single unconditional job that runs all four commands", async () => {
    const job = (await readWorkflow()).jobs[JOB];

    expect(job).toBeDefined();
    // A matrix would report under suffixed names that no required
    // context matches, and an `if:` could skip the job and still pass.
    expect(job?.strategy).toBeUndefined();
    expect(job?.if).toBeUndefined();

    const steps = job?.steps ?? [];
    const runs = steps.flatMap((step) => (step.run === undefined ? [] : [step.run.trim()]));
    expect(runs).toEqual(COMMANDS);
    for (const step of steps.filter((candidate) => candidate.run !== undefined)) {
      expect(step.if).toBeUndefined();
    }
  });
});

/**
 * Read and validate the workflow that owns `build-test`.
 *
 * @example
 * ```ts
 * const workflow = await readWorkflow();
 * // workflow.jobs["build-test"] holds the job under test.
 * ```
 *
 * @returns The parsed workflow.
 */
async function readWorkflow(): Promise<Workflow> {
  return v.parse(WorkflowSchema, Bun.YAML.parse(await Bun.file(WORKFLOW).text()));
}

/**
 * Return the workflow's triggers as a mapping.
 *
 * YAML 1.1 readers turn an unquoted `on` key into boolean `true`, so both
 * spellings are read; a list or scalar form becomes a mapping of empty
 * values.
 *
 * @example
 * ```ts
 * readTriggers({ on: ["push", "pull_request"], jobs: {} });
 * // => { push: null, pull_request: null }
 * ```
 *
 * @param workflow - A parsed workflow.
 * @returns Trigger names mapped to their configuration.
 */
function readTriggers(workflow: Workflow): Record<string, unknown> {
  const raw = workflow.on ?? workflow.true;
  if (typeof raw === "string") return { [raw]: null };
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((name) => [String(name), null]));
  return (raw ?? {}) as Record<string, unknown>;
}
