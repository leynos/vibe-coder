/**
 * @file Application machine behaviour tests.
 *
 * Validates the initial state and graph reachability for `appMachine` with
 * XState helpers. The tests cover boot success, boot failure, retry
 * reachability, and the absence of future run workflow states.
 */

import { describe, expect, test } from "bun:test";
import { createActor } from "xstate";
import { createTestModel } from "xstate/graph";

import { appMachine } from "../src/application";

const appMachineEvents = [
  { type: "BOOT_READY" },
  { type: "BOOT_FAILED" },
  { type: "RETRY_BOOT" },
] as const;

describe("appMachine", () => {
  test("starts in booting before any boot outcome is known", () => {
    const actor = createActor(appMachine).start();
    const snapshot = actor.getSnapshot();

    expect(snapshot.matches("booting")).toBe(true);
  });

  test("uses XState graph paths to reach every accepted boot workflow state", () => {
    const model = createTestModel(appMachine, { events: appMachineEvents });

    for (const state of ["booting", "title", "failed"] as const) {
      const paths = model.getShortestPaths({
        toState: (snapshot) => snapshot.matches(state),
      });

      expect(paths.length).toBeGreaterThan(0);
    }
  });

  test("does not expose a running workflow state before run machines exist", () => {
    const model = createTestModel(appMachine, { events: appMachineEvents });
    const shortestPaths = model.getShortestPaths();

    expect(shortestPaths.some((path) => path.state.matches("running"))).toBe(false);
  });
});
