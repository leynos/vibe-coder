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

export type AppMachineEvent =
  | { readonly type: "BOOT_READY" }
  | { readonly type: "BOOT_FAILED" }
  | { readonly type: "RETRY_BOOT" };

export const appMachine = createMachine({
  id: "app",
  types: {} as {
    events: AppMachineEvent;
  },
  initial: "booting",
  states: {
    booting: {
      on: {
        BOOT_FAILED: { target: "failed" },
        BOOT_READY: { target: "title" },
      },
    },
    title: {},
    failed: {
      on: {
        RETRY_BOOT: { target: "booting" },
      },
    },
  },
});
