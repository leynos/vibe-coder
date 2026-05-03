declare module "jest-axe" {
  import type { AxeResults, RunOptions } from "axe-core";

  export interface AxeMatcherResult {
    pass: boolean;
    message(): string;
  }

  export function axe(
    html?: Element | Document | string,
    options?: RunOptions,
  ): Promise<AxeResults>;

  export function configureAxe(options?: {
    globalOptions?: Parameters<typeof import("axe-core")["configure"]>[0];
  } & RunOptions): typeof axe;

  export const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): AxeMatcherResult;
  };
}

declare module "i18next-fluent-backend" {
  import type { BackendModule, Services } from "i18next";

  interface FluentBackendOptions {
    loadPath?: string;
  }

  class FluentBackend implements BackendModule<FluentBackendOptions> {
    type: "backend";
    // i18next treats backend modules as classes with an optional constructor signature.
    // Including the constructor here makes `use(FluentBackend)` type-safe.
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    constructor(services?: Services, options?: FluentBackendOptions);

    init?(options?: FluentBackendOptions, callback?: (error?: unknown) => void): void;

    read(
      language: string,
      namespace: string,
      callback: (error: unknown, data: unknown) => void,
    ): void;
  }

  export default FluentBackend;
}

declare module "bun:test" {
  interface Matchers<T = unknown> {
    toHaveNoViolations(): T;
    toBeInTheDocument(): T;
  }
}

declare module "vitest" {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
    toBeInTheDocument(): T;
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): unknown;
    toBeInTheDocument(): unknown;
  }

  export * from "bun:test";
}

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;

  interface GlobalThis {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
}
