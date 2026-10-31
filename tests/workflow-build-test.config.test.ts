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

const StepWithSchema = v.object({
  "persist-credentials": v.optional(v.boolean()),
});

const StepSchema = v.object({
  run: v.optional(v.string()),
  uses: v.optional(v.string()),
  with: v.optional(StepWithSchema),
  if: v.optional(v.unknown()),
  "continue-on-error": v.optional(v.unknown()),
});

// Filters that would stop `build-test` running on an ordinary pull request.
const PULL_REQUEST_FILTERS = [
  "branches",
  "branches-ignore",
  "paths",
  "paths-ignore",
  "types",
] as const;

const JobSchema = v.object({
  if: v.optional(v.unknown()),
  "continue-on-error": v.optional(v.unknown()),
  strategy: v.optional(v.unknown()),
  steps: v.optional(v.array(StepSchema)),
});

const STRING_ARRAY_SCHEMA = v.array(v.string());

const TriggerSchema = v.object({
  branches: v.optional(STRING_ARRAY_SCHEMA),
  "branches-ignore": v.optional(STRING_ARRAY_SCHEMA),
  paths: v.optional(STRING_ARRAY_SCHEMA),
  "paths-ignore": v.optional(STRING_ARRAY_SCHEMA),
  types: v.optional(STRING_ARRAY_SCHEMA),
});

const TriggerMapSchema = v.object({
  push: v.optional(v.nullable(TriggerSchema)),
  pull_request: v.optional(v.nullable(TriggerSchema)),
});

const TriggerNameListSchema = v.pipe(
  v.union([v.string(), STRING_ARRAY_SCHEMA]),
  v.transform((value) => (Array.isArray(value) ? value : [value])),
);

const TriggerMapToNormalisedSchema = v.pipe(
  TriggerMapSchema,
  v.transform((triggers) => ({
    push: triggers.push ?? null,
    pullRequest: triggers.pull_request ?? null,
  })),
);

const TriggerListToNormalisedSchema = v.pipe(
  TriggerNameListSchema,
  v.transform((names) => ({
    push: names.includes("push") ? null : undefined,
    pullRequest: names.includes("pull_request") ? null : undefined,
  })),
);

const TriggersSchema = v.union([TriggerMapToNormalisedSchema, TriggerListToNormalisedSchema]);

const WorkflowSchema = v.object({
  on: v.optional(TriggersSchema),
  true: v.optional(TriggersSchema),
  jobs: v.record(v.string(), JobSchema),
});

type Workflow = v.InferOutput<typeof WorkflowSchema>;
type Triggers = v.InferOutput<typeof TriggersSchema>;

const EMPTY_TRIGGERS: Triggers = { push: undefined, pullRequest: undefined };

describe("build-test job contract", () => {
  it("runs on every pull request and on pushes to main", async () => {
    const triggers = readTriggers(await readWorkflow());

    expect(triggers.pullRequest).not.toBeUndefined();
    // `pull_request: { types: [closed] }` would still name the trigger while
    // never running the job on an opened or updated pull request.
    const pullRequest = triggers.pullRequest;
    const presentFilters = PULL_REQUEST_FILTERS.filter(
      (filter) => pullRequest?.[filter] !== undefined,
    );
    expect(presentFilters).toEqual([]);
    expect(triggers.push?.branches ?? []).toContain("main");
  });

  it("is a single unconditional job that runs all four commands", async () => {
    const workflow = await readWorkflow();
    const job = workflow.jobs[JOB];

    expect(job).toBeDefined();
    // A matrix would report under suffixed names that no required
    // context matches, and an `if:` could skip the job and still pass.
    expect(job?.strategy).toBeUndefined();
    expect(job?.if).toBeUndefined();
    // `continue-on-error` would let a failing command leave the job green.
    expect(job?.["continue-on-error"]).toBeUndefined();

    const steps = job?.steps ?? [];
    const runs = steps.flatMap((step) => (step.run === undefined ? [] : [step.run.trim()]));
    expect(runs).toEqual(COMMANDS);
    for (const step of steps.filter((candidate) => candidate.run !== undefined)) {
      expect(step.if).toBeUndefined();
      expect(step["continue-on-error"]).toBeUndefined();
    }
  });

  it("checks out without persisting credentials for the build's dependency code", async () => {
    const workflow = await readWorkflow();
    const steps = workflow.jobs[JOB]?.steps ?? [];
    const checkout = steps.find((step) => step.uses?.startsWith("actions/checkout@"));

    expect(checkout?.with?.["persist-credentials"]).toBe(false);
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
 * Return the workflow's triggers in a normalised form.
 *
 * YAML 1.1 readers turn an unquoted `on` key into boolean `true`, so both
 * spellings are read; a list or scalar form is widened to the same shape as
 * the mapping form.
 *
 * @example
 * ```ts
 * readTriggers({ on: ["push", "pull_request"], jobs: {} });
 * // => { push: null, pullRequest: null }
 * ```
 *
 * @param workflow - A parsed workflow.
 * @returns The `push` and `pull_request` trigger configurations, if present.
 */
function readTriggers(workflow: Workflow): Triggers {
  return workflow.on ?? workflow.true ?? EMPTY_TRIGGERS;
}
