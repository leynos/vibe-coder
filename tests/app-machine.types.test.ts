/**
 * @file Compile-time application machine contract tests.
 *
 * Validates the public event, state, and action type contracts exported by the
 * first application-layer XState machine. The `@ts-expect-error` assertions are
 * enforced by `bun check:types` because `tsconfig.json` includes `tests/`.
 */

import { describe, expectTypeOf, test } from "bun:test";
import type { ActorRefFrom } from "xstate";

import type {
  AppMachineAction,
  AppMachineEvent,
  AppMachineStateValue,
  appMachine,
} from "../src/application";

const validEvents = [
  { type: "BOOT_READY" },
  { type: "BOOT_FAILED" },
  { type: "RETRY_BOOT" },
] satisfies readonly AppMachineEvent[];

const validStateValues = ["booting", "failed", "title"] satisfies readonly AppMachineStateValue[];

const validActions = [
  { type: "recordBootFailed" },
  { type: "recordBootRetryRequested" },
  { type: "recordBootSucceeded" },
] satisfies readonly AppMachineAction[];

type AppMachineActor = ActorRefFrom<typeof appMachine>;
type ActorSendEvent = Parameters<AppMachineActor["send"]>[0];
type ExpectedAppMachineEventType = (typeof validEvents)[number]["type"];
type ExpectedAppMachineStateValue = (typeof validStateValues)[number];
type ExpectedAppMachineActionType = (typeof validActions)[number]["type"];

describe("appMachine type contracts", () => {
  describe("negative type contracts", () => {
    test("rejects invalid event types at compile time", () => {
      // @ts-expect-error: machine events must remain limited to declared boot workflow events.
      const invalidEvent: AppMachineEvent = { type: "BOOT_STARTED" };

      void invalidEvent;
    });

    test("rejects invalid state values at compile time", () => {
      // @ts-expect-error: application boot states must not include future run workflow states.
      const invalidStateValue: AppMachineStateValue = "running";

      void invalidStateValue;
    });

    test("rejects invalid action types at compile time", () => {
      // @ts-expect-error: observability action IDs must stay on the declared machine contract.
      const invalidAction: AppMachineAction = { type: "recordBootCancelled" };

      void invalidAction;
    });
  });

  test("keeps actor sends limited to declared machine events", () => {
    expectTypeOf<ActorSendEvent>().toMatchTypeOf<AppMachineEvent>();
    expectTypeOf<{ type: "BOOT_READY" }>().toMatchTypeOf<AppMachineEvent>();
    expectTypeOf<{ type: "BOOT_STARTED" }>().not.toMatchTypeOf<AppMachineEvent>();
  });

  test("keeps state and action contracts limited to declared values", () => {
    expectTypeOf<"booting">().toMatchTypeOf<AppMachineStateValue>();
    expectTypeOf<"running">().not.toMatchTypeOf<AppMachineStateValue>();
    expectTypeOf<{ type: "recordBootFailed" }>().toMatchTypeOf<AppMachineAction>();
    expectTypeOf<{ type: "recordBootCancelled" }>().not.toMatchTypeOf<AppMachineAction>();
  });

  test("keeps the valid type fixtures assignable", () => {
    expectTypeOf<typeof validEvents>().toMatchTypeOf<readonly AppMachineEvent[]>();
    expectTypeOf<typeof validStateValues>().toMatchTypeOf<readonly AppMachineStateValue[]>();
    expectTypeOf<typeof validActions>().toMatchTypeOf<readonly AppMachineAction[]>();
  });

  test("keeps the public unions exhaustive", () => {
    expectTypeOf<AppMachineEvent["type"]>().toEqualTypeOf<ExpectedAppMachineEventType>();
    expectTypeOf<AppMachineStateValue>().toEqualTypeOf<ExpectedAppMachineStateValue>();
    expectTypeOf<AppMachineAction["type"]>().toEqualTypeOf<ExpectedAppMachineActionType>();
  });
});
