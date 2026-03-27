/**
 * Tests for shell autocompletion utilities
 */

import type { PromptDefinition } from "@canonical/summon-core";
import { describe, expect, it } from "vitest";
import { getArgumentCompletions, isPathPrompt } from "./completion.js";

// =============================================================================
// isPathPrompt
// =============================================================================

describe("isPathPrompt", () => {
  it("detects path in prompt name", () => {
    expect(
      isPathPrompt({ name: "componentPath", type: "text", message: "Enter:" }),
    ).toBe(true);
  });

  it("detects dir in prompt name", () => {
    expect(
      isPathPrompt({ name: "outputDir", type: "text", message: "Enter:" }),
    ).toBe(true);
  });

  it("detects directory in prompt name", () => {
    expect(
      isPathPrompt({
        name: "outputDirectory",
        type: "text",
        message: "Enter:",
      }),
    ).toBe(true);
  });

  it("detects file in prompt name", () => {
    expect(
      isPathPrompt({ name: "configFile", type: "text", message: "Enter:" }),
    ).toBe(true);
  });

  it("detects folder in prompt message", () => {
    expect(
      isPathPrompt({
        name: "output",
        type: "text",
        message: "Choose output folder:",
      }),
    ).toBe(true);
  });

  it("detects location in prompt message", () => {
    expect(
      isPathPrompt({
        name: "output",
        type: "text",
        message: "File location:",
      }),
    ).toBe(true);
  });

  it("returns false for non-path prompts", () => {
    expect(
      isPathPrompt({ name: "name", type: "text", message: "Package name:" }),
    ).toBe(false);
  });

  it("returns false for confirm prompts", () => {
    expect(
      isPathPrompt({
        name: "withStyles",
        type: "confirm",
        message: "Include styles?",
      }),
    ).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(
      isPathPrompt({ name: "MyPath", type: "text", message: "Enter:" }),
    ).toBe(true);
  });
});

// =============================================================================
// getArgumentCompletions
// =============================================================================

describe("getArgumentCompletions", () => {
  const prompts: PromptDefinition[] = [
    { name: "componentPath", type: "text", message: "Component path:" },
    {
      name: "withStyles",
      type: "confirm",
      message: "Include styles?",
      default: true,
    },
    {
      name: "withStories",
      type: "confirm",
      message: "Include stories?",
      default: true,
    },
    {
      name: "type",
      type: "select",
      message: "Package type:",
      choices: [
        { value: "library", label: "Library" },
        { value: "tool-ts", label: "Tool" },
        { value: "css", label: "CSS" },
      ],
    },
  ];

  it("returns flag completions when completing a flag name", () => {
    const completions = getArgumentCompletions(
      prompts,
      "summon test --comp",
      "--comp",
    );

    expect(completions).toContain("--component-path");
  });

  it("shows --no-X for confirm prompts with default true", () => {
    const completions = getArgumentCompletions(
      prompts,
      "summon test --no-",
      "--no-",
    );

    expect(completions).toContain("--no-with-styles");
    expect(completions).toContain("--no-with-stories");
  });

  it("returns select choices when completing a flag value", () => {
    const completions = getArgumentCompletions(
      prompts,
      "summon test --type=",
      "",
    );

    expect(completions).toContain("library");
    expect(completions).toContain("tool-ts");
    expect(completions).toContain("css");
  });

  it("filters select choices by partial value", () => {
    const completions = getArgumentCompletions(
      prompts,
      "summon test --type=lib",
      "",
    );

    expect(completions).toContain("library");
    expect(completions).not.toContain("tool-ts");
    expect(completions).not.toContain("css");
  });

  it("includes built-in flags", () => {
    const completions = getArgumentCompletions(
      prompts,
      "summon test --dry",
      "--dry",
    );

    expect(completions).toContain("--dry-run");
  });

  it("shows all flags when showAll is true", () => {
    const completions = getArgumentCompletions(
      prompts,
      "summon test",
      "",
      true,
    );

    expect(completions).toContain("--component-path");
    expect(completions).toContain("--dry-run");
    expect(completions).toContain("--help");
  });

  it("returns empty array when no matches", () => {
    const completions = getArgumentCompletions(
      prompts,
      "summon test --zzz",
      "--zzz",
    );

    expect(completions).toHaveLength(0);
  });

  it("includes --yes and --verbose in built-in flags", () => {
    const completions = getArgumentCompletions([], "summon test --", "--");

    expect(completions).toContain("--yes");
    expect(completions).toContain("--verbose");
    expect(completions).toContain("--llm");
    expect(completions).toContain("--help");
  });
});
