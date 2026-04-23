import { describe, expect, it } from "vitest";
import wrapper from "./wrapper.js";

describe("wrapper", () => {
  it("returns the original wrapper definition", () => {
    const definition = {
      id: "app:layout",
      component: ({ children }: { children: string }) => children,
    };

    expect(wrapper(definition)).toBe(definition);
  });
});
