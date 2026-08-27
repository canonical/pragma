import type { Effect, PromptQuestion } from "@canonical/task";
import { describe, expect, it } from "vitest";
import answerPromptWithDefaults from "./answerPromptWithDefaults.js";

const prompt = (question: PromptQuestion): Effect & { _tag: "Prompt" } => ({
  _tag: "Prompt",
  question,
});

describe("answerPromptWithDefaults", () => {
  it("resolves a confirm to its default", async () => {
    expect(
      await answerPromptWithDefaults(
        prompt({ type: "confirm", name: "ok", message: "?", default: false }),
      ),
    ).toBe(false);
  });

  it("defaults a confirm to false when unset — aligned with the dry-run mock", async () => {
    // The three non-interactive resolutions previously disagreed (dry-run
    // false, defaults true, autoPrompt reject): a --dry-run plan could take a
    // different branch than the identical defaults-driven run.
    expect(
      await answerPromptWithDefaults(
        prompt({ type: "confirm", name: "ok", message: "?" }),
      ),
    ).toBe(false);
  });

  it("resolves a select to its default", async () => {
    expect(
      await answerPromptWithDefaults(
        prompt({
          type: "select",
          name: "shell",
          message: "?",
          choices: [{ label: "Zsh", value: "zsh" }],
          default: "zsh",
        }),
      ),
    ).toBe("zsh");
  });

  it("falls back to the first choice for a select with no default", async () => {
    expect(
      await answerPromptWithDefaults(
        prompt({
          type: "select",
          name: "shell",
          message: "?",
          choices: [
            { label: "Bash", value: "bash" },
            { label: "Zsh", value: "zsh" },
          ],
        }),
      ),
    ).toBe("bash");
  });

  it("resolves a select with no default and no choices to an empty string", async () => {
    // Aligned with the dry-run mock's `?? ""` — previously this injected
    // `undefined` into the answers.
    expect(
      await answerPromptWithDefaults(
        prompt({ type: "select", name: "mode", message: "?", choices: [] }),
      ),
    ).toBe("");
  });

  it("resolves a multiselect to its default", async () => {
    expect(
      await answerPromptWithDefaults(
        prompt({
          type: "multiselect",
          name: "features",
          message: "?",
          choices: [{ label: "A", value: "a" }],
          default: ["a"],
        }),
      ),
    ).toEqual(["a"]);
  });

  it("defaults a multiselect to empty", async () => {
    expect(
      await answerPromptWithDefaults(
        prompt({
          type: "multiselect",
          name: "features",
          message: "?",
          choices: [],
        }),
      ),
    ).toEqual([]);
  });

  it("resolves a text prompt to its default", async () => {
    expect(
      await answerPromptWithDefaults(
        prompt({ type: "text", name: "name", message: "?", default: "hi" }),
      ),
    ).toBe("hi");
  });

  it("defaults a text prompt to an empty string", async () => {
    expect(
      await answerPromptWithDefaults(
        prompt({ type: "text", name: "name", message: "?" }),
      ),
    ).toBe("");
  });
});
