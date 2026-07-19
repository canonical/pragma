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
  onSubmit,
  onCancel,
}: {
  question: ConfirmPrompt;
  onSubmit: (value: boolean) => void;
  onCancel: () => void;
}) => {
  const defaultValue = Boolean(question.default);
  useInput((input, key) => {
    if (input.toLowerCase() === "y") onSubmit(true);
    else if (input.toLowerCase() === "n") onSubmit(false);
    else if (key.return) onSubmit(defaultValue);
    else if (key.escape) onCancel();
  });
  return (
    <Box>
      <Text color="magenta">› </Text>
      <Text bold>{question.message} </Text>
      <Text dimColor>({defaultValue ? "Y/n" : "y/N"})</Text>
    </Box>
  );
};

const SelectQuestion = ({
  question,
  onSubmit,
  onCancel,
}: {
  question: SelectPrompt;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) => {
  const items = question.choices.map((c) => ({
    label: c.label,
    value: c.value,
  }));
  const initialIndex = question.default
    ? items.findIndex((i) => i.value === question.default)
    : 0;
  useInput((_input, key) => {
    if (key.escape) onCancel();
  });
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
          onSelect={(item) => onSubmit(item.value)}
        />
      </Box>
    </Box>
  );
};

const MultiselectQuestion = ({
  question,
  onSubmit,
  onCancel,
}: {
  question: MultiselectPrompt;
  onSubmit: (values: string[]) => void;
  onCancel: () => void;
}) => {
  const choices = question.choices;
  const [selected, setSelected] = useState<Set<string>>(
    new Set(question.default),
  );
  const [highlighted, setHighlighted] = useState(0);
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow) {
      setHighlighted((p) => (p > 0 ? p - 1 : choices.length - 1));
    } else if (key.downArrow) {
      setHighlighted((p) => (p < choices.length - 1 ? p + 1 : 0));
    } else if (input === " ") {
      const choice = choices[highlighted];
      if (choice) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(choice.value)) next.delete(choice.value);
          else next.add(choice.value);
          return next;
        });
      }
    } else if (key.return) {
      onSubmit([...selected]);
    }
  });
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
    </Box>
  );
};

/** Render the widget for a single {@link PromptQuestion}. */
export const QuestionView = ({
  question,
  onSubmit,
  onCancel,
}: {
  question: PromptQuestion;
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
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "select":
      return (
        <SelectQuestion
          question={question}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
    case "multiselect":
      return (
        <MultiselectQuestion
          question={question}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      );
  }
};
