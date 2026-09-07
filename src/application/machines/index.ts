/**
 * Application machine exports.
 *
 * This barrel keeps inbound adapters and tests on the accepted
 * `src/application/machines/` boundary without exposing future machine
 * internals before their roadmap slices exist.
 *
 * @file Application machine exports.
 * @module
 */

export type { AppMachineAction, AppMachineEvent, AppMachineStateValue } from "./app.machine";
export { appMachine } from "./app.machine";
