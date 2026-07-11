import { createInterface, type Interface } from "node:readline";
import type { Effect, PromptQuestion } from "@canonical/task";

/**
 * An interactive prompt session: the `promptHandler` seam implementation a
 * terminal front-end injects into the shared executor, plus its lifecycle.
 * Create one per command run and dispose it when the run ends.
 */
export interface InteractivePromptSession {
  /** Resolve a `Prompt` effect by asking the user over readline. */
  readonly answerPrompt: (
    effect: Effect & { _tag: "Prompt" },
  ) => Promise<unknown>;
  /** Whether the user interrupted a prompt (Ctrl-C). */
  readonly wasInterrupted: () => boolean;
  /** Release the underlying readline interface. Safe to call twice. */
  readonly dispose: () => void;
}

/** Thrown when the user interrupts a prompt — the run must abort, not proceed. */
export class PromptInterruptedError extends Error {
  constructor() {
    super("Prompt interrupted");
    this.name = "PromptInterruptedError";
  }
}

/** Render a choice list to stderr as a numbered menu. */
function renderChoices(
  choices: ReadonlyArray<{ label: string; value: string }>,
): void {
  for (const [index, choice] of choices.entries()) {
    process.stderr.write(`  ${index + 1}) ${choice.label}\n`);
  }
}

/**
 * Resolve one answer token against a choice list: a 1-based number, an exact
 * value, or an exact label.
 */
function matchChoice(
  choices: ReadonlyArray<{ label: string; value: string }>,
  token: string,
): string | undefined {
  const index = Number(token);
  if (Number.isInteger(index) && index >= 1 && index <= choices.length) {
    return choices[index - 1]?.value;
  }
  const matched = choices.find(
    (choice) => choice.value === token || choice.label === token,
  );
  return matched?.value;
}

/**
 * Create an interactive prompt session over stdin/stderr.
 *
 * One readline interface spans the whole session, so answers piped in a
 * single chunk (`printf "n\nWidget\n" | pragma …`) survive across questions —
 * closing a per-question interface would discard its buffered lines. Prompts
 * render on stderr, keeping stdout clean for piping. On EOF (a closed or
 * non-interactive stdin) every prompt resolves to its default instead of
 * hanging.
 *
 * The unified dialect, per prompt type:
 * - text: shows the default in parentheses; empty input takes the default or
 *   re-asks when there is none; a `validate` failure re-asks with its message.
 * - confirm: `[Y/n]`/`[y/N]`; empty input takes the default, re-asks when the
 *   default is undefined.
 * - select/multiselect: numbered menu; an answer token is a number, a value,
 *   or a label (multiselect: comma-separated); empty input takes the default
 *   or re-asks when there is none.
 *
 * @returns The session: the `promptHandler` seam function plus `dispose`.
 * @note Impure — reads from stdin and writes prompts to stderr.
 */
export default function createInteractivePromptSession(): InteractivePromptSession {
  let rl: Interface | undefined;
  let ended = process.stdin.readableEnded === true;
  let interrupted = false;
  let pending: ((value: string) => void) | undefined;

  const open = (): Interface => {
    if (rl === undefined) {
      rl = createInterface({ input: process.stdin, output: process.stderr });
      // Ctrl-C is an abort, not an EOF: proceeding with defaults would run the
      // very command the user is cancelling. Mark, then close.
      rl.on("SIGINT", () => {
        interrupted = true;
        rl?.close();
      });
      // EOF with a question outstanding: resolve it to "" so the caller falls
      // back to defaults; every later ask short-circuits on `ended`.
      rl.on("close", () => {
        ended = true;
        pending?.("");
        pending = undefined;
      });
    }
    return rl;
  };

  const ask = async (query: string): Promise<string> => {
    if (interrupted) {
      throw new PromptInterruptedError();
    }
    if (ended) {
      return "";
    }
    const answer = await new Promise<string>((resolve) => {
      pending = resolve;
      open().question(query, (value) => {
        pending = undefined;
        resolve(value.trim());
      });
    });
    if (interrupted) {
      throw new PromptInterruptedError();
    }
    return answer;
  };

  const askText = async (
    question: PromptQuestion & { type: "text" },
  ): Promise<string> => {
    const hint = question.default === undefined ? "" : ` (${question.default})`;
    for (;;) {
      const answer = await ask(`${question.message}${hint}: `);
      if (answer === "") {
        if (question.default !== undefined) return question.default;
        if (ended) return "";
        continue;
      }
      const verdict = question.validate?.(answer) ?? true;
      if (verdict === true) return answer;
      process.stderr.write(
        `${typeof verdict === "string" ? verdict : "Invalid value."}\n`,
      );
      if (ended) return question.default ?? "";
    }
  };

  const askConfirm = async (
    question: PromptQuestion & { type: "confirm" },
  ): Promise<boolean> => {
    const hint =
      question.default === true
        ? "Y/n"
        : question.default === false
          ? "y/N"
          : "y/n";
    for (;;) {
      const answer = (
        await ask(`${question.message} [${hint}] `)
      ).toLowerCase();
      if (answer === "" && (question.default !== undefined || ended)) {
        return question.default ?? true;
      }
      if (answer === "y" || answer === "yes") return true;
      if (answer === "n" || answer === "no") return false;
    }
  };

  const askSelect = async (
    question: PromptQuestion & { type: "select" },
  ): Promise<string> => {
    if (question.choices.length === 0) {
      return question.default ?? "";
    }
    process.stderr.write(`${question.message}\n`);
    renderChoices(question.choices);
    const hint = question.default === undefined ? "" : ` (${question.default})`;
    for (;;) {
      const answer = await ask(`Choose a value${hint}: `);
      if (answer === "") {
        if (question.default !== undefined) return question.default;
        if (ended) return question.choices[0]?.value ?? "";
        continue;
      }
      // Tolerate a comma-separated answer at a single select: first valid token.
      const value = answer
        .split(",")
        .map((token) => matchChoice(question.choices, token.trim()))
        .find((match) => match !== undefined);
      if (value !== undefined) return value;
      if (ended) return question.default ?? question.choices[0]?.value ?? "";
    }
  };

  const askMultiselect = async (
    question: PromptQuestion & { type: "multiselect" },
  ): Promise<string[]> => {
    if (question.choices.length === 0) {
      return question.default ?? [];
    }
    process.stderr.write(`${question.message}\n`);
    renderChoices(question.choices);
    const hint =
      question.default === undefined ? "" : ` (${question.default.join(",")})`;
    for (;;) {
      const answer = await ask(`Choose one or more values${hint}: `);
      if (answer === "") {
        if (question.default !== undefined) return question.default;
        if (ended) return [];
        continue;
      }
      const picked = answer
        .split(",")
        .map((token) => matchChoice(question.choices, token.trim()))
        .filter((value): value is string => value !== undefined);
      if (picked.length > 0) return picked;
      if (ended) return question.default ?? [];
    }
  };

  return {
    answerPrompt: (effect) => {
      const question = effect.question;
      switch (question.type) {
        case "confirm":
          return askConfirm(question);
        case "select":
          return askSelect(question);
        case "multiselect":
          return askMultiselect(question);
        default:
          return askText(question);
      }
    },
    wasInterrupted: () => interrupted,
    dispose: () => {
      rl?.close();
      rl = undefined;
    },
  };
}
