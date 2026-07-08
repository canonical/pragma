import { describe, expect, it } from "vitest";

describe("@canonical/svelte-ds-global", () => {
  it("exports without throwing", async () => {
    await expect(import("./index.js")).resolves.toBeDefined();
  });
});
