import { createInterface } from "node:readline";
import type { Effect, PromptQuestion } from "@canonical/task";

/**
 * Read a single trimmed line from stdin, prompting on stderr so the answer
 * stays out of piped stdout. On EOF (a closed or non-interactive stdin, e.g.
 * `< /dev/null`) resolves to an empty string, so every caller falls back to its
 * default instead of hanging forever.
 *
 * Known limitation: each question opens a fresh readline interface, and
 * closing one discards lines buffered in the same data chunk — piping several
 * answers at once (`printf "n\nWidget\n" | pragma setup …`) honors only the
 * first; later prompts fall back to their defaults. Interactive TTY input,
 * where the user answers one prompt at a time, is unaffected.
 *
 * @param query - The prompt text to display.
 * @returns The user's trimmed input, or `""` on EOF.
 * @note Impure — reads from stdin.
 */
async function ask(query: string): Promise<string> {
  // Once stdin has ended, a fresh readline interface never emits another
  // 'close' — a second prompt after EOF would hang forever. Short-circuit to
  // the default path instead.
  if (process.stdin.readableEnded) {
    return "";
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await new Promise<string>((resolve) => {
    // EOF: 'close' fires with no answer, resolving to "". readline emits
    // 'close' synchronously from rl.close(), so the question callback must
    // resolve the real answer BEFORE closing — resolution is first-wins, and
    // resolving after close would hand every answer to this fallback.
    rl.on("close", () => resolve(""));
    rl.question(query, (value) => {
      resolve(value.trim());
      rl.close();
    });
  });
  return answer;
}

/**
 * Resolve a confirm prompt: empty input takes the default, else `y…` is true.
 *
 * @note Impure — reads from stdin.
 */
async function askConfirm(
  question: PromptQuestion & { type: "confirm" },
): Promise<boolean> {
  const defaultYes = question.default !== false;
  const answer = await ask(
    `${question.message} [${defaultYes ? "Y/n" : "y/N"}] `,
  );
  if (answer === "") return defaultYes;
  return answer.toLowerCase().startsWith("y");
}

/**
 * Render a choice list to stderr as a numbered menu.
 *
 * @note Impure — writes to stderr.
 */
function renderChoices(
  choices: ReadonlyArray<{ label: string; value: string }>,
): void {
  for (const [index, choice] of choices.entries()) {
    process.stderr.write(`  ${index + 1}) ${choice.label}\n`);
  }
}

/** Map a 1-based index string to a choice value, or undefined if out of range. */
function getChoiceAt(
  choices: ReadonlyArray<{ label: string; value: string }>,
  token: string,
): string | undefined {
  const index = Number.parseInt(token, 10) - 1;
  return Number.isInteger(index) ? choices[index]?.value : undefined;
}

/**
 * Resolve a select prompt: pick one choice by number, empty takes the default.
 *
 * @note Impure — reads from stdin and renders a menu to stderr.
 */
async function askSelect(
  question: PromptQuestion & { type: "select" },
): Promise<string | undefined> {
  renderChoices(question.choices);
  const answer = await ask(
    `${question.message} [1-${question.choices.length}] `,
  );
  if (answer === "") return question.default ?? question.choices[0]?.value;
  return (
    getChoiceAt(question.choices, answer) ??
    question.default ??
    question.choices[0]?.value
  );
}

/**
 * Resolve a multiselect prompt: pick choices by comma-separated numbers. Empty
 * input, or an answer whose tokens are all out of range, takes the default (or
 * none) — symmetric with {@link askSelect}, so a fat-fingered answer never
 * silently collapses to an empty selection.
 *
 * @note Impure — reads from stdin and renders a menu to stderr.
 */
async function askMultiselect(
  question: PromptQuestion & { type: "multiselect" },
): Promise<string[]> {
  renderChoices(question.choices);
  const answer = await ask(`${question.message} [e.g. 1,3] `);
  if (answer === "") return question.default ?? [];
  const picked = answer
    .split(",")
    .map((token) => getChoiceAt(question.choices, token.trim()))
    .filter((value): value is string => value !== undefined);
  return picked.length > 0 ? picked : (question.default ?? []);
}

/**
 * Resolve a `Prompt` effect interactively over readline — the `promptHandler`
 * seam pragma's terminal wizard injects into the shared executor.
 *
 * Every prompt type is answerable from the line editor: a confirm reads `y`/`n`,
 * a text prompt reads a line (empty takes the default), and select/multiselect
 * render a numbered menu answered by choice number(s). No prompt silently falls
 * back to its default when the user is present.
 *
 * @param effect - A `Prompt` effect to resolve interactively.
 * @returns The user's answer, typed to match the prompt.
 * @note Impure — reads from stdin and writes menus to stderr.
 */
export default async function answerPromptInteractively(
  effect: Effect & { _tag: "Prompt" },
): Promise<unknown> {
  const question = effect.question;
  switch (question.type) {
    case "confirm":
      return askConfirm(question);
    case "select":
      return askSelect(question);
    case "multiselect":
      return askMultiselect(question);
    default: {
      const answer = await ask(`${question.message} `);
      return answer === "" ? (question.default ?? "") : answer;
    }
  }
}
