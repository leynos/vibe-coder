/**
 * @file Application commands barrel.
 *
 * Application commands hold use-case entry points that orchestrate domain work
 * through ports, machines, and application services. Commands may import
 * domain types, domain ports, application machines, and other application
 * services for orchestration, but must not import adapter implementations.
 * Domain state validation and transition rules belong in domain services;
 * application-level guards may coordinate those checks without duplicating the
 * domain rules. See
 * `docs/vibe-coder-high-level-design.md` section "Module layout".
 */
