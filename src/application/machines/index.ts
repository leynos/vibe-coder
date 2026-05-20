/**
 * @file Application machine exports.
 *
 * This barrel keeps inbound adapters and tests on the accepted
 * `src/application/machines/` boundary without exposing future machine
 * internals before their roadmap slices exist.
 */

export type { AppMachineEvent } from "./app.machine";
export { appMachine } from "./app.machine";
