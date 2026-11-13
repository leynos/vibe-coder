/**
 * Application layer barrel.
 *
 * The application layer wires domain services together into use-case
 * implementations, hosts XState machines for workflow orchestration, and
 * exposes application services that inbound adapters call. Modules here may
 * import from the domain layer but must not import adapter implementations.
 *
 * See `docs/adrs/adr-0002-adopt-hexagonal-architecture-for-domain-boundaries.md`
 * and `docs/adrs/adr-0003-use-xstate-for-workflow-orchestration.md` for rationale.
 *
 * @file Application layer barrel.
 * @module
 */

export type { AppMachineAction, AppMachineEvent, AppMachineStateValue } from "./machines";
export { appMachine } from "./machines";
