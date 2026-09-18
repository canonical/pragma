import { afterEach, describe, expect, it } from "vitest";
import { getIconRoot, setIconRoot } from "./iconRoot.js";

describe("icon root", () => {
  afterEach(() => {
    setIconRoot("/icons");
  });

  it("defaults to /icons", () => {
    expect(getIconRoot()).toBe("/icons");
  });

  it("can be configured application-wide", () => {
    setIconRoot("/new_dashboard/icons");

    expect(getIconRoot()).toBe("/new_dashboard/icons");
  });
});
