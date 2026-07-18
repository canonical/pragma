import { promptEffect } from "@canonical/task";
import { describe, expect, it } from "vitest";
import autoPrompt, {
  MISSING_REQUIRED_ANSWER,
  missingRequiredError,
} from "./autoPrompt.js";
import mcpPrompt from "./mcpPrompt.js";
import type { PromptEffect } from "./types.js";

const text = (name: string, def?: string): PromptEffect =>
  promptEffect({
    type: "text",
    name,
    message: `${name}?`,
    ...(def !== undefined ? { default: def } : {}),
  }) as PromptEffect;

describe("autoPrompt", () => {
  it("resolves an unprovided prompt to its declared default", async () => {
    await expect(autoPrompt()(text("path", "out.txt"))).resolves.toBe(
      "out.txt",
    );
  });

  it("rejects a required (no-default) prompt with a structured error", async () => {
    await expect(autoPrompt()(text("name"))).rejects.toMatchObject({
      taskError: { code: MISSING_REQUIRED_ANSWER, context: { answer: "name" } },
    });
  });

  it("names the missing input with its kebab flag", () => {
    const err = missingRequiredError(text("componentPath"), "flag");
    expect(err.taskError.message).toContain("--component-path");
  });
});

describe("mcpPrompt", () => {
  it("resolves from the tool args when present (even falsy values)", async () => {
    await expect(mcpPrompt({ enabled: false })(text("enabled"))).resolves.toBe(
      false,
    );
  });

  it("falls back to the declared default when not in args", async () => {
    await expect(mcpPrompt({})(text("path", "d.txt"))).resolves.toBe("d.txt");
  });

  it("rejects (never hangs) when neither an arg nor a default exists", async () => {
    await expect(mcpPrompt({})(text("name"))).rejects.toMatchObject({
      taskError: { code: MISSING_REQUIRED_ANSWER },
    });
  });
});
