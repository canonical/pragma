import {
  type AnswerablePrompt,
  createExitResult,
  type InteractiveHandler,
  promptForAnswers,
  runGeneratorTask,
} from "@canonical/cli-core";
import createInteractivePromptSession from "../domains/shared/createInteractivePromptSession.js";

const isInteractiveTerminal = (): boolean =>
  process.stdin.isTTY === true && process.stdout.isTTY === true;

/**
 * Answer a generator's remaining prompts interactively, then execute the
 * command in batch mode with the collected answers.
 *
 * The questions flow as `Prompt` effects through the shared executor's
 * `promptHandler` seam — the same path `pragma setup` prompts take — answered
 * by one readline session spanning the whole run. Prompts already provided as
 * CLI flags are not asked again; `when` conditions are honoured against the
 * answers collected so far.
 *
 * @note Impure — prompts on stderr, reads stdin, then executes the command.
 */
const runInteractiveCommand: InteractiveHandler = async ({
  spec,
  command,
  params,
  ctx,
}) => {
  if (!isInteractiveTerminal()) {
    return null;
  }

  const session = createInteractivePromptSession();
  let answers: Record<string, unknown>;

  process.stderr.write("\n");
  try {
    answers = await runGeneratorTask(
      promptForAnswers(
        spec.generator.prompts as readonly AnswerablePrompt[],
        spec.partialAnswers,
      ),
      { promptHandler: session.answerPrompt },
    );
  } catch (error) {
    // Ctrl-C aborts the wizard — never fall through to executing the command.
    if (session.wasInterrupted()) {
      process.exitCode = 130;
      return createExitResult(130);
    }
    throw error;
  } finally {
    session.dispose();
  }

  return command.execute({ ...params, ...answers, yes: true }, ctx);
};

export default runInteractiveCommand;
