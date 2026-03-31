import { stdout as processStdout } from "node:process";
import { createInterface } from "node:readline/promises";
import {
  createExitResult,
  type InteractiveHandler,
  type InteractiveSpec,
} from "@canonical/cli-core";

type PromptWithWhen = InteractiveSpec["generator"]["prompts"][number] & {
  readonly when?: ((answers: Record<string, unknown>) => boolean) | undefined;
};

const isInteractiveTerminal = (): boolean =>
  process.stdin.isTTY === true && process.stdout.isTTY === true;

const getPromptDefault = (
  prompt: PromptWithWhen,
  answers: Record<string, unknown>,
): unknown => {
  if (prompt.name in answers) {
    return answers[prompt.name];
  }
  return prompt.default;
};

async function promptForText(
  rl: ReturnType<typeof createInterface>,
  prompt: PromptWithWhen,
  answers: Record<string, unknown>,
): Promise<string> {
  const defaultValue = getPromptDefault(prompt, answers);
  const defaultSuffix =
    defaultValue !== undefined ? ` (${String(defaultValue)})` : "";

  while (true) {
    const response = (
      await rl.question(`${prompt.message}${defaultSuffix}: `)
    ).trim();
    if (response.length > 0) {
      return response;
    }
    if (defaultValue !== undefined) {
      return String(defaultValue);
    }
  }
}

async function promptForConfirm(
  rl: ReturnType<typeof createInterface>,
  prompt: PromptWithWhen,
  answers: Record<string, unknown>,
): Promise<boolean> {
  const defaultValue = getPromptDefault(prompt, answers);
  const hint =
    defaultValue === true ? "Y/n" : defaultValue === false ? "y/N" : "y/n";

  while (true) {
    const response = (await rl.question(`${prompt.message} [${hint}]: `))
      .trim()
      .toLowerCase();

    if (response.length === 0 && defaultValue !== undefined) {
      return Boolean(defaultValue);
    }
    if (["y", "yes"].includes(response)) {
      return true;
    }
    if (["n", "no"].includes(response)) {
      return false;
    }
  }
}

async function promptForSelect(
  rl: ReturnType<typeof createInterface>,
  prompt: PromptWithWhen,
  answers: Record<string, unknown>,
  multiple: boolean,
): Promise<string | string[]> {
  const choices = prompt.choices ?? [];
  const defaultValue = getPromptDefault(prompt, answers);

  if (choices.length === 0) {
    return multiple
      ? Array.isArray(defaultValue)
        ? defaultValue.map(String)
        : defaultValue !== undefined
          ? [String(defaultValue)]
          : []
      : String(defaultValue ?? "");
  }

  processStdout.write(`${prompt.message}\n`);
  choices.forEach((choice, index) => {
    processStdout.write(`  ${index + 1}) ${choice.label}\n`);
  });

  const defaultSuffix =
    defaultValue === undefined
      ? ""
      : ` (${Array.isArray(defaultValue) ? defaultValue.join(",") : String(defaultValue)})`;

  while (true) {
    const response = (
      await rl.question(
        multiple
          ? `Choose one or more values${defaultSuffix}: `
          : `Choose a value${defaultSuffix}: `,
      )
    ).trim();

    if (response.length === 0 && defaultValue !== undefined) {
      return multiple
        ? Array.isArray(defaultValue)
          ? defaultValue.map(String)
          : [String(defaultValue)]
        : String(defaultValue);
    }

    const parsed = response
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => {
        const index = Number(part);
        if (Number.isInteger(index) && index >= 1 && index <= choices.length) {
          return choices[index - 1]?.value;
        }

        const matched = choices.find(
          (choice) => choice.value === part || choice.label === part,
        );
        return matched?.value;
      })
      .filter((value): value is string => typeof value === "string");

    if (parsed.length === 0) {
      continue;
    }

    return multiple ? parsed : (parsed[0] ?? String(defaultValue ?? ""));
  }
}

async function promptForValue(
  rl: ReturnType<typeof createInterface>,
  prompt: PromptWithWhen,
  answers: Record<string, unknown>,
): Promise<unknown> {
  switch (prompt.type) {
    case "confirm":
      return promptForConfirm(rl, prompt, answers);
    case "select":
      return promptForSelect(rl, prompt, answers, false);
    case "multiselect":
      return promptForSelect(rl, prompt, answers, true);
    default:
      return promptForText(rl, prompt, answers);
  }
}

const runInteractiveCommand: InteractiveHandler = async ({
  spec,
  command,
  params,
  ctx,
}) => {
  if (!isInteractiveTerminal()) {
    return null;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answers: Record<string, unknown> = { ...spec.partialAnswers };

  try {
    processStdout.write("\n");

    for (const prompt of spec.generator.prompts as readonly PromptWithWhen[]) {
      if (prompt.when && prompt.when(answers) !== true) {
        continue;
      }

      answers[prompt.name] = await promptForValue(rl, prompt, answers);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      process.exitCode = 130;
      return createExitResult(130);
    }
    throw error;
  } finally {
    rl.close();
  }

  return command.execute({ ...params, ...answers, yes: true }, ctx);
};

export default runInteractiveCommand;
