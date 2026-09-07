/**
 * @file Application boot workflow machine.
 *
 * This module demonstrates the accepted ADR 003 placement for application-layer
 * XState machines. The machine models only boot reachability and failure
 * recovery; it intentionally excludes simulation state, persistence payloads,
 * resource equations, and React concerns.
 *
 * @example
 * ```ts
 * import { createActor } from "xstate";
 * import { appMachine } from "./app.machine";
 *
 * const actor = createActor(appMachine).start();
 * actor.getSnapshot().value; // "booting"
 * actor.send({ type: "BOOT_READY" });
 * actor.getSnapshot().value; // "title"
 * ```
 */

import { createMachine } from "xstate";

/**
 * Events accepted by the application boot workflow machine.
 */
export type AppMachineEvent =
  | {
      /** Signals that the boot sequence completed successfully. */
      readonly type: "BOOT_READY";
    }
  | {
      /** Signals that the boot sequence failed. */
      readonly type: "BOOT_FAILED";
    }
  | {
      /** Requests a retry of a failed boot sequence. */
      readonly type: "RETRY_BOOT";
    };

/**
 * State values exposed by the application boot workflow machine.
 */
export type AppMachineStateValue = "booting" | "failed" | "title";

/**
 * Named actions emitted by boot workflow transitions for adapters to observe.
 */
export type AppMachineAction =
  | {
      /** Emitted when a boot attempt fails. */
      readonly type: "recordBootFailed";
    }
  | {
      /** Emitted when a retry is requested after a boot failure. */
      readonly type: "recordBootRetryRequested";
    }
  | {
      /** Emitted when a boot attempt succeeds. */
      readonly type: "recordBootSucceeded";
    };

/**
 * XState machine that models boot success, boot failure, and retry reachability.
 */
export const appMachine = createMachine({
  id: "app",
  types: {} as {
    actions: AppMachineAction;
    events: AppMachineEvent;
  },
  initial: "booting",
  states: {
    booting: {
      on: {
        BOOT_FAILED: {
          actions: { type: "recordBootFailed" },
          target: "failed",
        },
        BOOT_READY: {
          actions: { type: "recordBootSucceeded" },
          target: "title",
        },
      },
    },
    title: {},
    failed: {
      on: {
        RETRY_BOOT: {
          actions: { type: "recordBootRetryRequested" },
          target: "booting",
        },
      },
    },
  },
});
