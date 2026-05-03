/**
 * @file Adapters layer barrel.
 *
 * The adapters layer contains concrete implementations of the driven ports
 * defined in the domain layer (storage, clock, random source, audio events,
 * asset catalogue, telemetry) as well as inbound adapter glue (React
 * components, service workers, self-play runners). Adapters may import from
 * the domain and application layers but must not contain business rules.
 *
 * See `docs/adr-002-adopt-hexagonal-architecture-for-domain-boundaries.md`
 * for the full boundary rules.
 */
