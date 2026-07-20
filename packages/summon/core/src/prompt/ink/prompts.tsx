/**
 * The single-question Ink widgets + shared display bits, ported from the summon
 * wizard and retargeted at the task alphabet's {@link PromptQuestion} (the
 * shape a `Prompt` effect carries). Under `prompt/ink/**` — dynamic-only.
 */

import type {
  ConfirmPrompt,
  MultiselectPrompt,
  PromptQuestion,
  SelectPrompt,
  TextPrompt,
} from "@canonical/task";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useState } from "react";
import type PromptDefinition from "../../types/PromptDefinition.js";
import { evaluateValidation, type ValidateFn } from "./answerValidation.js";
import { classifySelectChoices } from "./selectChoices.js";

/** Format an answer value for the completed-answers table. */
export const formatAnswerValue = (
  value: unknown,
  prompt: Pick<PromptDefinition, "type" | "choices">,
): string => {
  if (value === undefined || value === null) return "";
  if (prompt.type === "confirm") return value ? "Yes" : "No";
  if (prompt.type === "select" && prompt.choices) {
    const choice = prompt.choices.find((c) => c.value === value);
    return choice?.label ?? String(value);
  }
  if (prompt.type === "multiselect" && Array.isArray(value)) {
    if (value.length === 0) return "None";
    if (prompt.choices) {
      return value
        .map((v) => prompt.choices?.find((c) => c.value === v)?.label ?? v)
        .join(", ");
    }
    return value.join(", ");
  }
  return String(value);
};

/** The completed-answers table (aligned, borderless). */
export const AnswersTable = ({
  prompts,
  answers,
}: {
  prompts: PromptDefinition[];
  answers: Record<string, unknown>;
}) => {
  const active = prompts.filter((p) => {
    if (p.when && p.when(answers) !== true) return false;
    return p.name in answers;
  });
  if (active.length === 0) return null;

  const width = Math.max(...active.map((p) => p.message.length));
  return (
    <Box flexDirection="column" marginBottom={1}>
      {active.map((prompt) => (
        <Box key={prompt.name}>
          <Text color="green">✔ </Text>
          <Text dimColor>{prompt.message.padEnd(width)}</Text>
          <Text dimColor> </Text>
          <Text color="cyan">
            {formatAnswerValue(answers[prompt.name], prompt)}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

/** The "Step N of M" progress header. */
export const ProgressHeader = ({
  current,
  total,
}: {
  current: number;
  total: number;
}) => (
  <Box marginBottom={1}>
    <Text dimColor>
      Step {current} of {total}
    </Text>
  </Box>
);

const TextQuestion = ({
  question,
  onSubmit,
  onCancel,
}: {
  question: TextPrompt;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) => {
  const [value, setValue] = useState(String(question.default ?? ""));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(String(question.default ?? ""));
    setError(null);
  }, [question.default]);

  const handleSubmit = useCallback(
    (val: string) => {
      if (question.validate) {
        const result = question.validate(val);
        if (result !== true) {
          setError(typeof result === "string" ? result : "Invalid input");
          return;
        }
      }
      onSubmit(val);
    },
    [question, onSubmit],
  );

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta">› </Text>
        <Text bold>{question.message}</Text>
      </Box>
      <Box marginLeft={2}>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color="red">✘ {error}</Text>
        </Box>
      )}
    </Box>
  );
};

const ConfirmQuestion = ({
  question,
  validate,
  onSubmit,
  onCancel,
}: {
  question: ConfirmPrompt;
  validate?: ValidateFn;
  onSubmit: (value: boolean) => void;
  onCancel: () => void;
}) => {
  const defaultValue = Boolean(question.default);
  const [error, setError] = useState<string | null>(null);
  const submit = (value: boolean): void => {
    const result = evaluateValidation(validate, value);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSubmit(value);
  };
  useInput((input, key) => {
    if (input.toLowerCase() === "y") submit(true);
    else if (input.toLowerCase() === "n") submit(false);
    else if (key.return) submit(defaultValue);
    else if (key.escape) onCancel();
  });
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta">› </Text>
        <Text bold>{question.message} </Text>
        <Text dimColor>({defaultValue ? "Y/n" : "y/N"})</Text>
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color="red">✘ {error}</Text>
        </Box>
      )}
    </Box>
  );
};

const SelectQuestion = ({
  question,
  validate,
  onSubmit,
  onCancel,
}: {
  question: SelectPrompt;
  validate?: ValidateFn;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) => {
  const [error, setError] = useState<string | null>(null);
  const classification = classifySelectChoices(question.choices);

  const submit = useCallback(
    (value: string) => {
      const result = evaluateValidation(validate, value);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSubmit(value);
    },
    [validate, onSubmit],
  );

  // A single forced choice resolves itself — no keystroke, no hang (C4). It
  // submits DIRECTLY (not through the inline-validate gate, which exists for
  // interactive recovery that a one-option list cannot offer); a self-
  // contradicting generator is still caught by run-level `validateAnswers`. A
  // second submit from a stray re-render is a no-op (the controller has already
  // cleared the pending prompt).
  const single = classification.kind === "single" ? classification.value : null;
  useEffect(() => {
    if (single !== null) onSubmit(single);
  }, [single, onSubmit]);

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  // Zero choices would render an empty list only Ctrl-C/Escape could leave —
  // surface it as a clear error instead of a silent dead-end (C4).
  if (classification.kind === "empty") {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="magenta">› </Text>
          <Text bold>{question.message}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="red">
            ✘ No options are available to choose from. Press Escape or Ctrl-C to
            exit.
          </Text>
        </Box>
      </Box>
    );
  }

  // The single choice is auto-resolving (above); render only the question line.
  if (classification.kind === "single") {
    return (
      <Box>
        <Text color="magenta">› </Text>
        <Text bold>{question.message}</Text>
      </Box>
    );
  }

  const items = classification.choices.map((c) => ({
    label: c.label,
    value: c.value,
  }));
  const initialIndex = question.default
    ? items.findIndex((i) => i.value === question.default)
    : 0;
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta">› </Text>
        <Text bold>{question.message}</Text>
        <Text dimColor> (↑↓ to select, enter to confirm)</Text>
      </Box>
      <Box marginLeft={2}>
        <SelectInput
          items={items}
          initialIndex={initialIndex >= 0 ? initialIndex : 0}
          onSelect={(item) => submit(item.value)}
        />
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color="red">✘ {error}</Text>
        </Box>
      )}
    </Box>
  );
};

const MultiselectQuestion = ({
  question,
  validate,
  onSubmit,
  onCancel,
}: {
  question: MultiselectPrompt;
  validate?: ValidateFn;
  onSubmit: (values: string[]) => void;
  onCancel: () => void;
}) => {
  const choices = question.choices;
  const classification = classifySelectChoices(choices);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(question.default),
  );
  const [highlighted, setHighlighted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    // Zero choices is a dead-end (nothing to toggle; Enter could only ever fail
    // a min-selection validator). The render below surfaces a clear error, so
    // here we swallow every key but Escape — a stray Enter must not submit `[]`.
    if (classification.kind === "empty") return;
    if (key.upArrow) {
      setHighlighted((p) => (p > 0 ? p - 1 : choices.length - 1));
    } else if (key.downArrow) {
      setHighlighted((p) => (p < choices.length - 1 ? p + 1 : 0));
    } else if (input === " ") {
      const choice = choices.at(highlighted);
      if (choice) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(choice.value)) next.delete(choice.value);
          else next.add(choice.value);
          return next;
        });
        // A fresh toggle changes the selection, so any stale min-selection
        // error (C-lo3) no longer applies — clear it rather than let the ✘
        // linger over a now-valid choice.
        setError(null);
      }
    } else if (key.return) {
      // Run the prompt's own validator INLINE (C6) — this is also how a
      // multiselect enforces a minimum selection (C-lo3): a validator that
      // rejects an empty array re-asks in place instead of submitting `[]`.
      const values = [...selected];
      const result = evaluateValidation(validate, values);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSubmit(values);
    }
  });

  // Zero choices would render an empty toggle list only Escape/Ctrl-C could
  // leave — and, with the min-selection validator (C-lo3), an Enter that can
  // only ever fail. Surface a clear error instead of that silent dead-end,
  // mirroring the select guard (C4).
  if (classification.kind === "empty") {
    return (
      <Box flexDirection="column">
        <Box>
          <Text color="magenta">› </Text>
          <Text bold>{question.message}</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="red">
            ✘ No options are available to choose from. Press Escape or Ctrl-C to
            exit.
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta">› </Text>
        <Text bold>{question.message}</Text>
        <Text dimColor> (space to toggle, enter to confirm)</Text>
      </Box>
      <Box marginLeft={2} flexDirection="column">
        {choices.map((choice, i) => {
          const isHi = i === highlighted;
          const isSel = selected.has(choice.value);
          return (
            <Box key={choice.value}>
              <Text color={isHi ? "magenta" : undefined}>
                {isHi ? "› " : "  "}
              </Text>
              <Text color={isSel ? "green" : "gray"}>
                {isSel ? "◉ " : "○ "}
              </Text>
              <Text color={isSel ? undefined : "gray"}>{choice.label}</Text>
            </Box>
          );
        })}
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color="red">✘ {error}</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Render the widget for a single {@link PromptQuestion}.
 *
 * `validate` is the prompt definition's own constraint (looked up by the wizard
 * from `generator.prompts`), threaded into the non-text widgets so they run it
 * INLINE with recovery (C6) — the `text` widget already validates via its own
 * question field.
 */
export const QuestionView = ({
  question,
  validate,
  onSubmit,
  onCancel,
}: {
  question: PromptQuestion;
  validate?: ValidateFn;
  onSubmit: (value: unknown) => void;
  onCancel: () => void;
}) => {
  switch (question.type) {
    case "text":
      return (
        <TextQuestion
          question={question}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "confirm":
      return (
        <ConfirmQuestion
          question={question}
          validate={validate}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "select":
      return (
        <SelectQuestion
          question={question}
          validate={validate}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "multiselect":
      return (
        <MultiselectQuestion
          question={question}
          validate={validate}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
  }
};
