/** @file Fails the test run when snapshot warnings are emitted. */

import { afterAll, expect } from "bun:test";

type SnapshotStateLike = {
  getUncheckedCount?: () => number;
  getUnmatched?: () => number;
  getUpdated?: () => number;
  getAdded?: () => number;
};

const snapshotWarnings: string[] = [];

const resolveSnapshotState = (): SnapshotStateLike | undefined => {
  const expectWithState = expect as unknown as {
    getState?: () => { snapshotState?: SnapshotStateLike };
  };
  const state = expectWithState.getState?.();
  return state?.snapshotState;
};

afterAll(() => {
  const snapshotState = resolveSnapshotState();
  if (!snapshotState) {
    return;
  }

  const unchecked = snapshotState.getUncheckedCount?.() ?? 0;
  const unmatched = snapshotState.getUnmatched?.() ?? 0;
  const updated = snapshotState.getUpdated?.() ?? 0;

  if (unchecked > 0) {
    snapshotWarnings.push(`${unchecked} unchecked snapshot${unchecked === 1 ? "" : "s"}`);
  }

  if (unmatched > 0) {
    snapshotWarnings.push(`${unmatched} unmatched snapshot${unmatched === 1 ? "" : "s"}`);
  }

  if (updated > 0) {
    snapshotWarnings.push(`${updated} updated snapshot${updated === 1 ? "" : "s"} (unexpected)`);
  }
});

afterAll(() => {
  if (snapshotWarnings.length > 0) {
    const uniqueWarnings = [...new Set(snapshotWarnings)];
    throw new Error(
      `Snapshot warnings detected:\n${uniqueWarnings
        .map((warning) => `  - ${warning}`)
        .join("\n")}`,
    );
  }
});
