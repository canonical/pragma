import { describe, expect, it } from "vitest";
import placeView from "./placeView.js";

describe("placeView", () => {
  it("puts the open view first, or takes it out, keeping the rest in order", () => {
    const params = new URLSearchParams("status=melted&view=old&tab=inventory");
    expect(placeView(params, "v1").toString()).toBe(
      "view=v1&status=melted&tab=inventory",
    );
    expect(placeView(params, null).toString()).toBe(
      "status=melted&tab=inventory",
    );
    expect(params.toString()).toBe("status=melted&view=old&tab=inventory");
    expect(
      placeView(new URLSearchParams("view=a&x=1&view=b"), "c").toString(),
    ).toBe("view=c&x=1");
  });
});
