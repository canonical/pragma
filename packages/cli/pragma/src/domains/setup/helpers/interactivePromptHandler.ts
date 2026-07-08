import { createInterface } from "node:readline";
import type { Effect, PromptQuestion } from "@canonical/task";

/**
 * Read a single trimmed line from stdin, prompting on stderr so the answer
 * stays out of piped stdout.
 *
 * @param query - The prompt text to display.
 * @returns The user's trimmed input.
 * @note Impure — reads from stdin.
 */
async function ask(query: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await new Promise<string>((resolve) => {
    rl.question(query, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
  return answer;
}

/** Resolve a confirm prompt: empty input takes the default, else `y…` is true. */
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

/** Render a choice list to stderr as a numbered menu. */
function renderChoices(
  choices: ReadonlyArray<{ label: string; value: string }>,
): void {
  for (const [index, choice] of choices.entries()) {
    process.stderr.write(`  ${index + 1}) ${choice.label}\n`);
  }
}

/** Map a 1-based index string to a choice value, or undefined if out of range. */
function choiceAt(
  choices: ReadonlyArray<{ label: string; value: string }>,
  token: string,
): string | undefined {
  const index = Number.parseInt(token, 10) - 1;
  return Number.isInteger(index) ? choices[index]?.value : undefined;
}

/** Resolve a select prompt: pick one choice by number, empty takes the default. */
async function askSelect(
  question: PromptQuestion & { type: "select" },
): Promise<string | undefined> {
  renderChoices(question.choices);
  const answer = await ask(
    `${question.message} [1-${question.choices.length}] `,
  );
  if (answer === "") return question.default ?? question.choices[0]?.value;
  return (
    choiceAt(question.choices, answer) ??
    question.default ??
    question.choices[0]?.value
  );
}

/**
 * Resolve a multiselect prompt: pick choices by comma-separated numbers; empty
 * input takes the default (or none).
 */
async function askMultiselect(
  question: PromptQuestion & { type: "multiselect" },
): Promise<string[]> {
  renderChoices(question.choices);
  const answer = await ask(`${question.message} [e.g. 1,3] `);
  if (answer === "") return question.default ?? [];
  const picked = answer
    .split(",")
    .map((token) => choiceAt(question.choices, token.trim()))
    .filter((value): value is string => value !== undefined);
  return picked;
}

/**
 * Resolve a `Prompt` effect interactively over readline — the `promptHandler`
 * seam pragma's terminal wizard injects into the journaled executor.
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
export default async function interactivePromptHandler(
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
