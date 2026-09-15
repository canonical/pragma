import { describe, expect, it } from "vitest";
import type { DataTableColumn } from "../../types.js";
import type { ColumnSetting } from "../types.js";
import areColumnSettingsEqual from "./areColumnSettingsEqual.js";

const name: DataTableColumn = { id: "name", header: "Name" };
const status: DataTableColumn = { id: "status", header: "Status" };

/** A setting for a column, every change taken unless said otherwise. */
const buildSetting = (
  column: DataTableColumn,
  overrides: Partial<Omit<ColumnSetting, "column">> = {},
): ColumnSetting => ({
  column,
  hidden: false,
  offers: { hide: true, show: false, "move-left": true, "move-right": true },
  ...overrides,
});

describe("areColumnSettingsEqual", () => {
  it("holds two lists saying the same of the same columns equal, whatever their identity", () => {
    expect(
      areColumnSettingsEqual(
        [buildSetting(name), buildSetting(status)],
        [buildSetting(name), buildSetting(status)],
      ),
    ).toBe(true);
    expect(areColumnSettingsEqual([], [])).toBe(true);
  });

  it("tells apart a different length, column, order, visibility or offer", () => {
    const base = [buildSetting(name), buildSetting(status)];
    const offers = buildSetting(status).offers;
    for (const other of [
      [buildSetting(name)],
      [buildSetting(status), buildSetting(name)],
      [buildSetting({ ...name }), buildSetting(status)],
      [buildSetting(name), buildSetting(status, { hidden: true })],
      [
        buildSetting(name),
        buildSetting(status, { offers: { ...offers, hide: false } }),
      ],
      [
        buildSetting(name),
        buildSetting(status, { offers: { ...offers, show: true } }),
      ],
      [
        buildSetting(name),
        buildSetting(status, { offers: { ...offers, "move-left": false } }),
      ],
      [
        buildSetting(name),
        buildSetting(status, { offers: { ...offers, "move-right": false } }),
      ],
    ]) {
      expect(areColumnSettingsEqual(base, other)).toBe(false);
    }
  });
});
