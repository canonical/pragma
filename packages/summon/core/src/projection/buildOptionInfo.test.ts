import { describe, expect, it } from "vitest";
import buildOptionInfo from "./buildOptionInfo.js";

describe("buildOptionInfo", () => {
  it("a default-true confirm registers only its --no- form", () => {
    expect(
      buildOptionInfo({
        name: "withStyles",
        type: "confirm",
        message: "Include styles?",
        default: true,
        group: "Options",
      }),
    ).toEqual({
      flags: "--no-with-styles",
      description: "Include styles?",
      group: "Options",
      promptName: "withStyles",
      kebabName: "with-styles",
    });
  });

  it("a default-false confirm registers the positive form", () => {
    expect(
      buildOptionInfo({
        name: "withRelay",
        type: "confirm",
        message: "Include Relay?",
        default: false,
      }),
    ).toEqual({
      flags: "--with-relay",
      description: "Include Relay?",
      group: undefined,
      promptName: "withRelay",
      kebabName: "with-relay",
    });
  });

  it("a select takes <value> and lists its choices in the description", () => {
    expect(
      buildOptionInfo({
        name: "type",
        type: "select",
        message: "Package type:",
        choices: [
          { label: "tool", value: "tool-ts" },
          { label: "lib", value: "library" },
        ],
        default: "tool-ts",
      }),
    ).toMatchObject({
      flags: "--type <value>",
      description: "Package type: [tool-ts|library]",
      kebabName: "type",
    });
  });

  it("a choice-less select lists an empty set", () => {
    expect(
      buildOptionInfo({ name: "kind", type: "select", message: "Kind:" }),
    ).toMatchObject({ description: "Kind: []" });
  });

  it("a multiselect takes a comma-separated <values>", () => {
    expect(
      buildOptionInfo({
        name: "features",
        type: "multiselect",
        message: "Features:",
        choices: [{ label: "a", value: "a" }],
      }),
    ).toMatchObject({
      flags: "--features <values>",
      description: "Features: (comma-separated)",
    });
  });

  it("a text prompt takes <value>, and defaults never reach Commander", () => {
    const info = buildOptionInfo({
      name: "componentPath",
      type: "text",
      message: "Component path:",
      default: "src/components/MyComponent",
    });
    expect(info).toMatchObject({
      flags: "--component-path <value>",
      description: "Component path:",
    });
    // Deliberate: defaults are applied by applyDefaults() after extraction so
    // explicit answers stay distinguishable from defaults.
    expect(info.defaultValue).toBeUndefined();
  });
});
