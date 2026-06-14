/**
 * @file Parity tests for Biome and AST import package restrictions.
 */

import { describe, expect, it } from "bun:test";

import {
  DISALLOWED_APPLICATION_PACKAGES,
  DISALLOWED_DOMAIN_PACKAGES,
} from "../scripts/import-boundaries";
import { getNoRestrictedImportsOverride, readBiomeConfig } from "./biome-config-helpers";

describe("restricted package parity", () => {
  const cases = [
    {
      layer: "domain",
      glob: "src/domain/**",
      disallowed: DISALLOWED_DOMAIN_PACKAGES,
    },
    {
      layer: "application",
      glob: "src/application/**",
      disallowed: DISALLOWED_APPLICATION_PACKAGES,
    },
  ] as const;

  for (const { layer, glob, disallowed } of cases) {
    it(`keeps ${layer} package restrictions in sync`, async () => {
      const config = await readBiomeConfig();
      const override = getNoRestrictedImportsOverride(config, glob);

      expect(override.options.paths).toBeDefined();
      expect(Object.keys(override.options.paths ?? {}).sort()).toEqual(
        [...disallowed.keys()].sort(),
      );
    });
  }
});
