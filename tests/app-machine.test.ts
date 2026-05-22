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

import { type AppMachineEvent, appMachine } from "../src/application";

const appMachineEvents = [
  { type: "BOOT_READY" },
  { type: "BOOT_FAILED" },
  { type: "RETRY_BOOT" },
] as const;

type TransitionStep = {
  readonly event: AppMachineEvent["type"];
  readonly state: string;
};

const snapshotValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
};

const runTransitionPath = (events: readonly AppMachineEvent[]): TransitionStep[] => {
  const actor = createActor(appMachine).start();

  return events.map((event) => {
    actor.send(event);
    return {
      event: event.type,
      state: snapshotValue(actor.getSnapshot().value),
    };
  });
};

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

  test("transitions from booting to title when boot is ready", () => {
    const actor = createActor(appMachine).start();

    actor.send({ type: "BOOT_READY" });

    expect(actor.getSnapshot().matches("title")).toBe(true);
  });

  test("transitions from booting to failed when boot fails", () => {
    const actor = createActor(appMachine).start();

    actor.send({ type: "BOOT_FAILED" });

    expect(actor.getSnapshot().matches("failed")).toBe(true);
  });

  test("transitions from failed to booting when boot is retried", () => {
    const actor = createActor(appMachine).start();

    actor.send({ type: "BOOT_FAILED" });
    actor.send({ type: "RETRY_BOOT" });

    expect(actor.getSnapshot().matches("booting")).toBe(true);
  });

  test("snapshots boot success and retry event paths", () => {
    expect(runTransitionPath([{ type: "BOOT_READY" }])).toMatchInlineSnapshot(`
      [
        {
          "event": "BOOT_READY",
          "state": "title",
        },
      ]
    `);

    expect(
      runTransitionPath([{ type: "BOOT_FAILED" }, { type: "RETRY_BOOT" }]),
    ).toMatchInlineSnapshot(`
        [
          {
            "event": "BOOT_FAILED",
            "state": "failed",
          },
          {
            "event": "RETRY_BOOT",
            "state": "booting",
          },
        ]
      `);
  });

  test("keeps rapid duplicate boot outcomes in the first terminal boot state", () => {
    const actor = createActor(appMachine).start();

    actor.send({ type: "BOOT_FAILED" });
    actor.send({ type: "BOOT_READY" });
    actor.send({ type: "BOOT_FAILED" });

    expect(actor.getSnapshot().matches("failed")).toBe(true);
  });

  test("keeps out-of-order retry events from leaving booting", () => {
    const actor = createActor(appMachine).start();

    actor.send({ type: "RETRY_BOOT" });
    actor.send({ type: "BOOT_READY" });

    expect(actor.getSnapshot().matches("title")).toBe(true);
  });

  test("ignores events after the app machine actor is stopped", () => {
    const actor = createActor(appMachine).start();

    actor.stop();
    actor.send({ type: "BOOT_READY" });

    expect(actor.getSnapshot().status).toBe("stopped");
    expect(actor.getSnapshot().matches("booting")).toBe(true);
  });

  test("does not expose a running workflow state before run machines exist", () => {
    const model = createTestModel(appMachine, { events: appMachineEvents });
    const shortestPaths = model.getShortestPaths();

    expect(shortestPaths.some((path) => path.state.matches("running"))).toBe(false);
  });
});
