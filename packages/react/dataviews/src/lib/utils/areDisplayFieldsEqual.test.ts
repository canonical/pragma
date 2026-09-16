import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import type { DisplayField, DisplayFieldCellProps } from "../common/index.js";
import areDisplayFieldsEqual from "./areDisplayFieldsEqual.js";

/** A cell renderer, compared by reference wherever a field names one. */
const Badge: ComponentType<DisplayFieldCellProps> = () => null;
const Chip: ComponentType<DisplayFieldCellProps> = () => null;

const fields: readonly DisplayField[] = [
  { id: "name", header: "Host" },
  { id: "state", header: "Status", field: "status", cell: Badge },
];

describe("areDisplayFieldsEqual", () => {
  it("holds two lists of the same fields equal", () => {
    expect(
      areDisplayFieldsEqual(fields, [
        { id: "name", header: "Host" },
        { id: "state", header: "Status", field: "status", cell: Badge },
      ]),
    ).toBe(true);
  });

  it("tells a renamed field apart", () => {
    expect(
      areDisplayFieldsEqual(fields, [
        { id: "host", header: "Host" },
        { id: "state", header: "Status", field: "status", cell: Badge },
      ]),
    ).toBe(false);
  });

  it("tells a field reading another record field apart", () => {
    // The id is the same; what it shows is not, so the scopes must be re-minted.
    expect(
      areDisplayFieldsEqual(fields, [
        { id: "name", header: "Host" },
        { id: "state", header: "Status", field: "region", cell: Badge },
      ]),
    ).toBe(false);
  });

  it("tells a changed heading apart", () => {
    expect(
      areDisplayFieldsEqual(fields, [
        { id: "name", header: "Machine" },
        { id: "state", header: "Status", field: "status", cell: Badge },
      ]),
    ).toBe(false);
  });

  it("tells a changed cell apart", () => {
    expect(
      areDisplayFieldsEqual(fields, [
        { id: "name", header: "Host" },
        { id: "state", header: "Status", field: "status", cell: Chip },
      ]),
    ).toBe(false);
  });

  it("tells lists of different lengths apart", () => {
    expect(areDisplayFieldsEqual(fields, fields.slice(0, 1))).toBe(false);
    expect(areDisplayFieldsEqual([], [])).toBe(true);
  });
});
