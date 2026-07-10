import type { Effect, PromptQuestion } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createInterfaceMock } = vi.hoisted(() => ({
  createInterfaceMock: vi.fn(),
}));

vi.mock("node:readline", () => ({ createInterface: createInterfaceMock }));

const { default: answerPromptInteractively } = await import(
  "./answerPromptInteractively.js"
);

const prompt = (question: PromptQuestion): Effect & { _tag: "Prompt" } => ({
  _tag: "Prompt",
  question,
});

/**
 * Make the mocked readline answer every question with a single line. The mock
 * honors the REAL readline contract: `close()` emits 'close' synchronously —
 * the exact behavior that regressed the handler when the answer was resolved
 * after closing.
 */
const answerWith = (line: string): void => {
  createInterfaceMock.mockImplementation(() => {
    const closeListeners: Array<() => void> = [];
    return {
      on: (event: string, handler: () => void) => {
        if (event === "close") closeListeners.push(handler);
      },
      question: (_query: string, cb: (answer: string) => void) => cb(line),
      close: () => {
        for (const handler of closeListeners) handler();
      },
    };
  });
};

/** Make the mocked readline reach EOF: 'close' fires with no answer. */
const answerWithEof = (): void => {
  createInterfaceMock.mockImplementation(() => ({
    on: (event: string, handler: () => void) => {
      if (event === "close") handler();
    },
    question: () => {},
    close: vi.fn(),
  }));
};

describe("answerPromptInteractively", () => {
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
      await answerPromptInteractively(
        prompt({ type: "confirm", name: "ok", message: "Continue?" }),
      ),
    ).toBe(true);
  });

  it("takes a false default confirm on empty input", async () => {
    answerWith("");
    expect(
      await answerPromptInteractively(
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
      await answerPromptInteractively(
        prompt({ type: "confirm", name: "ok", message: "Continue?" }),
      ),
    ).toBe(true);
  });

  it("honors an explicit no against a default-yes confirm, despite close() emitting 'close' synchronously", async () => {
    // Regression: the answer used to be resolved AFTER rl.close(); real
    // readline emits 'close' synchronously, so the EOF fallback resolved ""
    // first and every typed answer was discarded in favor of the default.
    answerWith("n");
    expect(
      await answerPromptInteractively(
        prompt({ type: "confirm", name: "ok", message: "Continue?" }),
      ),
    ).toBe(false);
  });

  // --- text ------------------------------------------------------------------

  it("reads a text answer", async () => {
    answerWith("Widget");
    expect(
      await answerPromptInteractively(
        prompt({ type: "text", name: "name", message: "Name?" }),
      ),
    ).toBe("Widget");
  });

  it("takes the text default on empty input", async () => {
    answerWith("");
    expect(
      await answerPromptInteractively(
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
      await answerPromptInteractively(
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
    expect(await answerPromptInteractively(prompt(shellSelect))).toBe("zsh");
    expect(stderrSpy).toHaveBeenCalledWith("  1) Bash\n");
    expect(stderrSpy).toHaveBeenCalledWith("  2) Zsh\n");
  });

  it("takes the select default on empty input", async () => {
    answerWith("");
    expect(
      await answerPromptInteractively(
        prompt({ ...shellSelect, default: "zsh" }),
      ),
    ).toBe("zsh");
  });

  it("falls back to the first choice on empty input with no default", async () => {
    answerWith("");
    expect(await answerPromptInteractively(prompt(shellSelect))).toBe("bash");
  });

  it("falls back to the default on an out-of-range select answer", async () => {
    answerWith("9");
    expect(
      await answerPromptInteractively(
        prompt({ ...shellSelect, default: "zsh" }),
      ),
    ).toBe("zsh");
  });

  it("falls back to the first choice on a non-numeric select answer", async () => {
    answerWith("nope");
    expect(await answerPromptInteractively(prompt(shellSelect))).toBe("bash");
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
    expect(await answerPromptInteractively(prompt(featureMulti))).toEqual([
      "a",
      "c",
    ]);
  });

  it("takes the multiselect default on empty input", async () => {
    answerWith("");
    expect(
      await answerPromptInteractively(
        prompt({ ...featureMulti, default: ["b"] }),
      ),
    ).toEqual(["b"]);
  });

  it("returns an empty selection on empty input with no default", async () => {
    answerWith("");
    expect(await answerPromptInteractively(prompt(featureMulti))).toEqual([]);
  });

  it("drops out-of-range tokens in a multiselect answer", async () => {
    answerWith("2,9");
    expect(await answerPromptInteractively(prompt(featureMulti))).toEqual([
      "b",
    ]);
  });

  it("takes the multiselect default on an all-invalid answer", async () => {
    answerWith("nope,zzz");
    expect(
      await answerPromptInteractively(
        prompt({ ...featureMulti, default: ["b"] }),
      ),
    ).toEqual(["b"]);
  });

  // --- EOF / non-interactive stdin -------------------------------------------

  it("falls back to the default on EOF instead of hanging", async () => {
    answerWithEof();
    expect(
      await answerPromptInteractively(
        prompt({ type: "confirm", name: "ok", message: "Continue?" }),
      ),
    ).toBe(true);
    expect(
      await answerPromptInteractively(
        prompt({ type: "text", name: "n", message: "Name?", default: "d" }),
      ),
    ).toBe("d");
    expect(
      await answerPromptInteractively(
        prompt({ ...featureMulti, default: ["c"] }),
      ),
    ).toEqual(["c"]);
  });

  it("answers with the default after stdin has ended, without opening readline", async () => {
    // Regression: after stdin EOF, a fresh readline interface never emits
    // another 'close', so a second prompt would hang forever. The handler
    // short-circuits on readableEnded instead.
    const endedSpy = vi
      .spyOn(process.stdin, "readableEnded", "get")
      .mockReturnValue(true);

    try {
      expect(
        await answerPromptInteractively(
          prompt({
            type: "confirm",
            name: "ok",
            message: "Continue?",
            default: false,
          }),
        ),
      ).toBe(false);
      expect(createInterfaceMock).not.toHaveBeenCalled();
    } finally {
      endedSpy.mockRestore();
    }
  });
});
