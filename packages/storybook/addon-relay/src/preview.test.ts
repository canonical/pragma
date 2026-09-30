import { describe, expect, it } from "vitest";
import { withRelayEnvironment } from "./index.js";
import preview from "./preview.js";

describe("preview", () => {
  it("registers the relay decorator in the Storybook preview config", () => {
    expect(preview.decorators).toEqual([withRelayEnvironment]);
  });
});
