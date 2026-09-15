import { describe, expect, it } from "vitest";
import readArrangementParams from "./readArrangementParams.js";

const read = (query: string) =>
  readArrangementParams(new URLSearchParams(query));

describe("readArrangementParams", () => {
  it("reads nothing from parameters carrying no arrangement", () => {
    expect(read("status=failed&view=v1")).toBeNull();
  });

  it("reads an order whole, hiding none where no hidden column is carried", () => {
    expect(read("table.order=cores&table.order=name")).toEqual({
      order: ["cores", "name"],
      hidden: [],
    });
    expect(
      read("table.order=cores&table.hidden=name&table.hidden=status"),
    ).toEqual({ order: ["cores"], hidden: ["name", "status"] });
  });

  it("leaves the order alone where only hidden columns are carried, and names no column by a blank", () => {
    expect(read("table.hidden=&table.hidden=cores")).toEqual({
      order: null,
      hidden: ["cores"],
    });
    expect(read("table.order=")).toEqual({ order: [], hidden: [] });
  });
});
