import { describe, expect, it } from "vitest";
import { PARITY_GAPS } from "./PARITY_GAPS.js";

/**
 * The ledger itself (R9): every accepted divergence is recorded as one
 * distinct, non-empty entry — mirroring the old `standardParity` suite's
 * "records every accepted divergence as a distinct entry" guarantee.
 */
describe("PARITY_GAPS ledger (PROTECTED)", () => {
  it("is non-empty", () => {
    expect(PARITY_GAPS.length).toBeGreaterThan(0);
  });

  it("every entry has a distinct id", () => {
    const ids = PARITY_GAPS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a non-empty area and description", () => {
    for (const entry of PARITY_GAPS) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.area.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(20);
    }
  });

  it("ids are kebab-case", () => {
    for (const entry of PARITY_GAPS) {
      expect(entry.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
