import type { Effect, PromptQuestion } from "@canonical/task";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createInterfaceMock } = vi.hoisted(() => ({
  createInterfaceMock: vi.fn(),
}));

vi.mock("node:readline", () => ({ createInterface: createInterfaceMock }));

const { default: createInteractivePromptSession } = await import(
  "./createInteractivePromptSession.js"
);

const prompt = (question: PromptQuestion): Effect & { _tag: "Prompt" } => ({
  _tag: "Prompt",
  question,
});

/**
 * A fake persistent readline interface honouring the real contract: one
 * interface answers many questions from a queue, `close()` emits 'close'
 * synchronously, and an exhausted queue simulates EOF by closing.
 */
const stubReadline = (lines: string[]) => {
  const closeListeners: Array<() => void> = [];
  const sigintListeners: Array<() => void> = [];
  const queries: string[] = [];
  const iface = {
    on: (event: string, handler: () => void) => {
      if (event === "close") closeListeners.push(handler);
      if (event === "SIGINT") sigintListeners.push(handler);
    },
    question: (query: string, cb: (answer: string) => void) => {
      queries.push(query);
      const next = lines.shift();
      if (next === undefined) {
        for (const handler of closeListeners) handler();
        return;
      }
      cb(next);
    },
    close: () => {
      for (const handler of closeListeners) handler();
    },
  };
  createInterfaceMock.mockReturnValue(iface);
  return {
    queries,
    sigint: () => {
      for (const handler of sigintListeners) handler();
    },
  };
};

/** A stub whose question never answers — for interrupt-while-pending tests. */
const stubHangingReadline = () => {
  const closeListeners: Array<() => void> = [];
  const sigintListeners: Array<() => void> = [];
  createInterfaceMock.mockReturnValue({
    on: (event: string, handler: () => void) => {
      if (event === "close") closeListeners.push(handler);
      if (event === "SIGINT") sigintListeners.push(handler);
    },
    question: () => {},
    close: () => {
      for (const handler of closeListeners) handler();
    },
  });
  return {
    sigint: () => {
      for (const handler of sigintListeners) handler();
    },
  };
};

describe("createInteractivePromptSession", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let writes: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    writes = [];
    stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((chunk) => {
        writes.push(String(chunk));
        return true;
      });
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  // --- text --------------------------------------------------------------

  it("reads a text answer and shows the default hint", async () => {
    const { queries } = stubReadline(["Widget"]);
    const session = createInteractivePromptSession();

    const answer = await session.answerPrompt(
      prompt({ type: "text", name: "n", message: "Name?", default: "Btn" }),
    );

    expect(answer).toBe("Widget");
    expect(queries[0]).toBe("Name? (Btn): ");
    session.dispose();
  });

  it("takes the text default on empty input", async () => {
    stubReadline([""]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(
        prompt({ type: "text", name: "n", message: "Name?", default: "Btn" }),
      ),
    ).toBe("Btn");
    session.dispose();
  });

  it("re-asks a text prompt while empty with no default", async () => {
    const { queries } = stubReadline(["", "", "Widget"]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(
        prompt({ type: "text", name: "n", message: "Name?" }),
      ),
    ).toBe("Widget");
    expect(queries).toHaveLength(3);
    session.dispose();
  });

  it("re-asks on a validate failure, printing its message", async () => {
    stubReadline(["bad", "good"]);
    const session = createInteractivePromptSession();

    const answer = await session.answerPrompt(
      prompt({
        type: "text",
        name: "n",
        message: "Name?",
        validate: (value) => value === "good" || "must be good",
      }),
    );

    expect(answer).toBe("good");
    expect(writes).toContain("must be good\n");
    session.dispose();
  });

  it("re-asks on a boolean-false validate verdict with a generic message", async () => {
    stubReadline(["bad", "good"]);
    const session = createInteractivePromptSession();

    const answer = await session.answerPrompt(
      prompt({
        type: "text",
        name: "n",
        message: "Name?",
        validate: (value) => value === "good",
      }),
    );

    expect(answer).toBe("good");
    expect(writes).toContain("Invalid value.\n");
    session.dispose();
  });

  // --- confirm -------------------------------------------------------------

  it("parses yes/no answers and hints from the default", async () => {
    const { queries } = stubReadline(["yes", "N"]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(
        prompt({ type: "confirm", name: "a", message: "A?", default: true }),
      ),
    ).toBe(true);
    expect(
      await session.answerPrompt(
        prompt({ type: "confirm", name: "b", message: "B?", default: false }),
      ),
    ).toBe(false);
    expect(queries).toEqual(["A? [Y/n] ", "B? [y/N] "]);
    session.dispose();
  });

  it("takes the confirm default on empty input", async () => {
    stubReadline([""]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(
        prompt({ type: "confirm", name: "a", message: "A?", default: false }),
      ),
    ).toBe(false);
    session.dispose();
  });

  it("re-asks a confirm with no default until it gets y or n", async () => {
    const { queries } = stubReadline(["", "maybe", "n"]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(
        prompt({ type: "confirm", name: "a", message: "A?" }),
      ),
    ).toBe(false);
    expect(queries).toEqual(["A? [y/n] ", "A? [y/n] ", "A? [y/n] "]);
    session.dispose();
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

  it("renders the menu and accepts a number, a value, or a label", async () => {
    stubReadline(["2", "bash", "Zsh"]);
    const session = createInteractivePromptSession();

    expect(await session.answerPrompt(prompt(shellSelect))).toBe("zsh");
    expect(await session.answerPrompt(prompt(shellSelect))).toBe("bash");
    expect(await session.answerPrompt(prompt(shellSelect))).toBe("zsh");
    expect(writes).toContain("Shell?\n");
    expect(writes).toContain("  1) Bash\n");
    expect(writes).toContain("  2) Zsh\n");
    session.dispose();
  });

  it("takes the select default on empty input, re-asks without one", async () => {
    const { queries } = stubReadline(["", "", "1"]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(prompt({ ...shellSelect, default: "zsh" })),
    ).toBe("zsh");
    expect(await session.answerPrompt(prompt(shellSelect))).toBe("bash");
    expect(queries).toHaveLength(3);
    session.dispose();
  });

  it("re-asks on an unmatched select answer", async () => {
    const { queries } = stubReadline(["9", "fish", "2"]);
    const session = createInteractivePromptSession();

    expect(await session.answerPrompt(prompt(shellSelect))).toBe("zsh");
    expect(queries).toHaveLength(3);
    session.dispose();
  });

  it("resolves a choiceless select to its default without prompting", async () => {
    stubReadline([]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(
        prompt({ ...shellSelect, choices: [], default: "zsh" }),
      ),
    ).toBe("zsh");
    expect(createInterfaceMock).not.toHaveBeenCalled();
    session.dispose();
  });

  // --- multiselect -------------------------------------------------------

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

  it("accepts comma-separated numbers, values, and labels", async () => {
    stubReadline(["1, b ,C"]);
    const session = createInteractivePromptSession();

    expect(await session.answerPrompt(prompt(featureMulti))).toEqual([
      "a",
      "b",
      "c",
    ]);
    session.dispose();
  });

  it("takes the multiselect default on empty input, re-asks on all-invalid", async () => {
    const { queries } = stubReadline(["", "x,y", "2"]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(prompt({ ...featureMulti, default: ["c"] })),
    ).toEqual(["c"]);
    expect(await session.answerPrompt(prompt(featureMulti))).toEqual(["b"]);
    expect(queries).toHaveLength(3);
    session.dispose();
  });

  it("resolves a choiceless multiselect to its default or none", async () => {
    stubReadline([]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(prompt({ ...featureMulti, choices: [] })),
    ).toEqual([]);
    session.dispose();
  });

  it("accepts a comma-separated single-select answer by its first valid token", async () => {
    stubReadline(["nope,2,1"]);
    const session = createInteractivePromptSession();

    expect(await session.answerPrompt(prompt(shellSelect))).toBe("zsh");
    session.dispose();
  });

  it("resolves a choiceless select with no default to an empty string", async () => {
    stubReadline([]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(prompt({ ...shellSelect, choices: [] })),
    ).toBe("");
    expect(createInterfaceMock).not.toHaveBeenCalled();
    session.dispose();
  });

  // --- interrupt -----------------------------------------------------------

  it("Ctrl-C rejects the pending prompt and marks the session interrupted", async () => {
    const { sigint } = stubHangingReadline();
    const session = createInteractivePromptSession();

    const pending = session.answerPrompt(
      prompt({ type: "confirm", name: "a", message: "A?", default: true }),
    );
    sigint();

    await expect(pending).rejects.toThrow("Prompt interrupted");
    expect(session.wasInterrupted()).toBe(true);
    await expect(
      session.answerPrompt(
        prompt({ type: "text", name: "b", message: "B?", default: "d" }),
      ),
    ).rejects.toThrow("Prompt interrupted");
    session.dispose();
  });

  // --- lifecycle -----------------------------------------------------------

  it("spans one readline interface across many questions", async () => {
    stubReadline(["n", "Widget"]);
    const session = createInteractivePromptSession();

    await session.answerPrompt(
      prompt({ type: "confirm", name: "a", message: "A?", default: true }),
    );
    await session.answerPrompt(
      prompt({ type: "text", name: "b", message: "B?" }),
    );

    expect(createInterfaceMock).toHaveBeenCalledTimes(1);
    session.dispose();
  });

  it("falls back to defaults for every prompt after EOF", async () => {
    // One answer, then the stream ends mid-question.
    stubReadline(["n"]);
    const session = createInteractivePromptSession();

    expect(
      await session.answerPrompt(
        prompt({ type: "confirm", name: "a", message: "A?", default: true }),
      ),
    ).toBe(false);
    expect(
      await session.answerPrompt(
        prompt({ type: "text", name: "b", message: "B?", default: "d" }),
      ),
    ).toBe("d");
    expect(
      await session.answerPrompt(
        prompt({ type: "confirm", name: "c", message: "C?" }),
      ),
    ).toBe(true);
    expect(await session.answerPrompt(prompt(shellSelect))).toBe("bash");
    expect(await session.answerPrompt(prompt(featureMulti))).toEqual([]);
    session.dispose();
  });

  it("never opens readline when stdin already ended", async () => {
    const endedSpy = vi
      .spyOn(process.stdin, "readableEnded", "get")
      .mockReturnValue(true);
    try {
      const session = createInteractivePromptSession();
      expect(
        await session.answerPrompt(
          prompt({ type: "text", name: "n", message: "N?", default: "d" }),
        ),
      ).toBe("d");
      expect(createInterfaceMock).not.toHaveBeenCalled();
      session.dispose();
    } finally {
      endedSpy.mockRestore();
    }
  });

  it("dispose closes the interface once and is safe to repeat", async () => {
    stubReadline(["x"]);
    const session = createInteractivePromptSession();
    await session.answerPrompt(
      prompt({ type: "text", name: "n", message: "N?" }),
    );

    session.dispose();
    session.dispose();

    // After dispose (which closed the interface), prompts resolve to defaults.
    expect(
      await session.answerPrompt(
        prompt({ type: "text", name: "n", message: "N?", default: "d" }),
      ),
    ).toBe("d");
  });
});
