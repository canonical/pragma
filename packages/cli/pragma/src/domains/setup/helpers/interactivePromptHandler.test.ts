import type { Effect, PromptQuestion } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createInterfaceMock } = vi.hoisted(() => ({
  createInterfaceMock: vi.fn(),
}));

vi.mock("node:readline", () => ({ createInterface: createInterfaceMock }));

const { default: interactivePromptHandler } = await import(
  "./interactivePromptHandler.js"
);

const prompt = (question: PromptQuestion): Effect & { _tag: "Prompt" } => ({
  _tag: "Prompt",
  question,
});

/** Make the mocked readline answer every question with a single line. */
const answerWith = (line: string): void => {
  createInterfaceMock.mockReturnValue({
    on: vi.fn(),
    question: (_query: string, cb: (answer: string) => void) => cb(line),
    close: vi.fn(),
  });
};

/** Make the mocked readline reach EOF: 'close' fires with no answer. */
const answerWithEof = (): void => {
  createInterfaceMock.mockReturnValue({
    on: (event: string, handler: () => void) => {
      if (event === "close") handler();
    },
    question: () => {},
    close: vi.fn(),
  });
};

describe("interactivePromptHandler", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  // --- confirm ---------------------------------------------------------------

  it("takes the confirm default on empty input", async () => {
    answerWith("");
    expect(
      await interactivePromptHandler(
        prompt({ type: "confirm", name: "ok", message: "Continue?" }),
      ),
    ).toBe(true);
  });

  it("takes a false default confirm on empty input", async () => {
    answerWith("");
    expect(
      await interactivePromptHandler(
        prompt({
          type: "confirm",
          name: "ok",
          message: "Continue?",
          default: false,
        }),
      ),
    ).toBe(false);
  });

  it("reads a yes for a confirm", async () => {
    answerWith("y");
    expect(
      await interactivePromptHandler(
        prompt({ type: "confirm", name: "ok", message: "Continue?" }),
      ),
    ).toBe(true);
  });

  it("reads a no for a confirm", async () => {
    answerWith("n");
    expect(
      await interactivePromptHandler(
        prompt({
          type: "confirm",
          name: "ok",
          message: "Continue?",
          default: false,
        }),
      ),
    ).toBe(false);
  });

  // --- text ------------------------------------------------------------------

  it("reads a text answer", async () => {
    answerWith("Widget");
    expect(
      await interactivePromptHandler(
        prompt({ type: "text", name: "name", message: "Name?" }),
      ),
    ).toBe("Widget");
  });

  it("takes the text default on empty input", async () => {
    answerWith("");
    expect(
      await interactivePromptHandler(
        prompt({
          type: "text",
          name: "name",
          message: "Name?",
          default: "Fallback",
        }),
      ),
    ).toBe("Fallback");
  });

  it("returns an empty string for a text prompt with no default", async () => {
    answerWith("");
    expect(
      await interactivePromptHandler(
        prompt({ type: "text", name: "name", message: "Name?" }),
      ),
    ).toBe("");
  });

  // --- select ----------------------------------------------------------------

  const shellSelect: PromptQuestion = {
    type: "select",
    name: "shell",
    message: "Shell?",
    choices: [
      { label: "Bash", value: "bash" },
      { label: "Zsh", value: "zsh" },
    ],
  };

  it("selects a choice by number and renders the menu", async () => {
    answerWith("2");
    expect(await interactivePromptHandler(prompt(shellSelect))).toBe("zsh");
    expect(stderrSpy).toHaveBeenCalledWith("  1) Bash\n");
    expect(stderrSpy).toHaveBeenCalledWith("  2) Zsh\n");
  });

  it("takes the select default on empty input", async () => {
    answerWith("");
    expect(
      await interactivePromptHandler(
        prompt({ ...shellSelect, default: "zsh" }),
      ),
    ).toBe("zsh");
  });

  it("falls back to the first choice on empty input with no default", async () => {
    answerWith("");
    expect(await interactivePromptHandler(prompt(shellSelect))).toBe("bash");
  });

  it("falls back to the default on an out-of-range select answer", async () => {
    answerWith("9");
    expect(
      await interactivePromptHandler(
        prompt({ ...shellSelect, default: "zsh" }),
      ),
    ).toBe("zsh");
  });

  it("falls back to the first choice on a non-numeric select answer", async () => {
    answerWith("nope");
    expect(await interactivePromptHandler(prompt(shellSelect))).toBe("bash");
  });

  // --- multiselect -----------------------------------------------------------

  const featureMulti: PromptQuestion = {
    type: "multiselect",
    name: "features",
    message: "Features?",
    choices: [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
      { label: "C", value: "c" },
    ],
  };

  it("selects multiple choices by comma-separated numbers", async () => {
    answerWith("1, 3");
    expect(await interactivePromptHandler(prompt(featureMulti))).toEqual([
      "a",
      "c",
    ]);
  });

  it("takes the multiselect default on empty input", async () => {
    answerWith("");
    expect(
      await interactivePromptHandler(
        prompt({ ...featureMulti, default: ["b"] }),
      ),
    ).toEqual(["b"]);
  });

  it("returns an empty selection on empty input with no default", async () => {
    answerWith("");
    expect(await interactivePromptHandler(prompt(featureMulti))).toEqual([]);
  });

  it("drops out-of-range tokens in a multiselect answer", async () => {
    answerWith("2,9");
    expect(await interactivePromptHandler(prompt(featureMulti))).toEqual(["b"]);
  });

  it("takes the multiselect default on an all-invalid answer", async () => {
    answerWith("nope,zzz");
    expect(
      await interactivePromptHandler(
        prompt({ ...featureMulti, default: ["b"] }),
      ),
    ).toEqual(["b"]);
  });

  // --- EOF / non-interactive stdin -------------------------------------------

  it("falls back to the default on EOF instead of hanging", async () => {
    answerWithEof();
    expect(
      await interactivePromptHandler(
        prompt({ type: "confirm", name: "ok", message: "Continue?" }),
      ),
    ).toBe(true);
    expect(
      await interactivePromptHandler(
        prompt({ type: "text", name: "n", message: "Name?", default: "d" }),
      ),
    ).toBe("d");
    expect(
      await interactivePromptHandler(
        prompt({ ...featureMulti, default: ["c"] }),
      ),
    ).toEqual(["c"]);
  });
});
