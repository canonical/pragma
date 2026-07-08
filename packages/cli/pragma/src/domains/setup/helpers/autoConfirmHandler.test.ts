import type { Effect, PromptQuestion } from "@canonical/task";
import { describe, expect, it } from "vitest";
import autoConfirmHandler from "./autoConfirmHandler.js";

const prompt = (question: PromptQuestion): Effect & { _tag: "Prompt" } => ({
  _tag: "Prompt",
  question,
});

describe("autoConfirmHandler", () => {
  it("resolves a confirm to its default", async () => {
    expect(
      await autoConfirmHandler(
        prompt({ type: "confirm", name: "ok", message: "?", default: false }),
      ),
    ).toBe(false);
  });

  it("defaults a confirm to true when unset", async () => {
    expect(
      await autoConfirmHandler(
        prompt({ type: "confirm", name: "ok", message: "?" }),
      ),
    ).toBe(true);
  });

  it("resolves a select to its default", async () => {
    expect(
      await autoConfirmHandler(
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
      await autoConfirmHandler(
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

  it("resolves a multiselect to its default", async () => {
    expect(
      await autoConfirmHandler(
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
      await autoConfirmHandler(
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
      await autoConfirmHandler(
        prompt({ type: "text", name: "name", message: "?", default: "hi" }),
      ),
    ).toBe("hi");
  });

  it("defaults a text prompt to an empty string", async () => {
    expect(
      await autoConfirmHandler(
        prompt({ type: "text", name: "name", message: "?" }),
      ),
    ).toBe("");
  });
});
