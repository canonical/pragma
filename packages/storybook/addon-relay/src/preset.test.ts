import { describe, expect, it } from "vitest";
import { viteFinal } from "./preset.js";

describe("viteFinal", () => {
  it("adds relay-test-utils when optimizeDeps.include is absent", () => {
    const config: Record<string, unknown> = {};

    const result = viteFinal(config);

    expect(result).toBe(config);
    expect(result.optimizeDeps).toEqual({
      include: ["relay-test-utils"],
    });
  });

  it("appends relay-test-utils to an existing include list", () => {
    const config: Record<string, unknown> = {
      optimizeDeps: {
        include: ["other-dependency"],
        exclude: ["excluded-dependency"],
      },
      plugins: ["plugin-a"],
    };

    const result = viteFinal(config);

    expect(result.optimizeDeps).toEqual({
      include: ["other-dependency", "relay-test-utils"],
      exclude: ["excluded-dependency"],
    });
    expect(result.plugins).toEqual(["plugin-a"]);
  });

  it("does not duplicate relay-test-utils when already included", () => {
    const config: Record<string, unknown> = {
      optimizeDeps: {
        include: ["relay-test-utils"],
      },
    };

    const result = viteFinal(config);

    expect(result.optimizeDeps).toEqual({
      include: ["relay-test-utils"],
    });
  });
});
