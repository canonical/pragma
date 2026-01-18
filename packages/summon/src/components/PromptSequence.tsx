/**
 * PromptSequence Component
 *
 * Handles interactive prompts for generators using React Ink.
 */

import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useCallback, useState } from "react";
import type { PromptDefinition } from "../types.js";

export interface PromptSequenceProps {
  /** List of prompts to display */
  prompts: PromptDefinition[];
  /** Called when all prompts are answered */
  onComplete: (answers: Record<string, unknown>) => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

interface TextPromptProps {
  prompt: PromptDefinition;
  onSubmit: (value: string) => void;
}

const TextPrompt = ({ prompt, onSubmit }: TextPromptProps) => {
  const [value, setValue] = useState(String(prompt.default ?? ""));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (val: string) => {
      if (prompt.validate) {
        const result = prompt.validate(val);
        if (result !== true) {
          setError(typeof result === "string" ? result : "Invalid input");
          return;
        }
      }
      onSubmit(val);
    },
    [prompt, onSubmit],
  );

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">? </Text>
        <Text bold>{prompt.message} </Text>
      </Box>
      <Box marginLeft={2}>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
};

interface ConfirmPromptProps {
  prompt: PromptDefinition;
  onSubmit: (value: boolean) => void;
}

const ConfirmPrompt = ({ prompt, onSubmit }: ConfirmPromptProps) => {
  const defaultValue = Boolean(prompt.default);

  useInput((input, key) => {
    if (input.toLowerCase() === "y") {
      onSubmit(true);
    } else if (input.toLowerCase() === "n") {
      onSubmit(false);
    } else if (key.return) {
      onSubmit(defaultValue);
    }
  });

  const hint = defaultValue ? "(Y/n)" : "(y/N)";

  return (
    <Box>
      <Text color="cyan">? </Text>
      <Text bold>{prompt.message} </Text>
      <Text dimColor>{hint}</Text>
    </Box>
  );
};

interface SelectPromptProps {
  prompt: PromptDefinition;
  onSubmit: (value: string) => void;
}

const SelectPrompt = ({ prompt, onSubmit }: SelectPromptProps) => {
  const items =
    prompt.choices?.map((choice) => ({
      label: choice.label,
      value: choice.value,
    })) ?? [];

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">? </Text>
        <Text bold>{prompt.message}</Text>
      </Box>
      <Box marginLeft={2}>
        <SelectInput items={items} onSelect={(item) => onSubmit(item.value)} />
      </Box>
    </Box>
  );
};

interface MultiselectPromptProps {
  prompt: PromptDefinition;
  onSubmit: (values: string[]) => void;
}

const MultiselectPrompt = ({ prompt, onSubmit }: MultiselectPromptProps) => {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(prompt.default as string[] | undefined),
  );
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const choices = prompt.choices ?? [];

  useInput((input, key) => {
    if (key.upArrow) {
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : choices.length - 1));
    } else if (key.downArrow) {
      setHighlightedIndex((prev) => (prev < choices.length - 1 ? prev + 1 : 0));
    } else if (input === " ") {
      const choice = choices[highlightedIndex];
      if (choice) {
        setSelected((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(choice.value)) {
            newSet.delete(choice.value);
          } else {
            newSet.add(choice.value);
          }
          return newSet;
        });
      }
    } else if (key.return) {
      onSubmit(Array.from(selected));
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">? </Text>
        <Text bold>{prompt.message}</Text>
        <Text dimColor> (space to select, enter to confirm)</Text>
      </Box>
      <Box marginLeft={2} flexDirection="column">
        {choices.map((choice, i) => {
          const isHighlighted = i === highlightedIndex;
          const isSelected = selected.has(choice.value);
          const pointer = isHighlighted ? "> " : "  ";
          const checkbox = isSelected ? "[x] " : "[ ] ";

          return (
            <Box key={choice.value}>
              <Text color={isHighlighted ? "cyan" : undefined}>{pointer}</Text>
              <Text color={isSelected ? "green" : undefined}>{checkbox}</Text>
              <Text>{choice.label}</Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export const PromptSequence = ({
  prompts,
  onComplete,
  onCancel,
}: PromptSequenceProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  // Filter prompts based on `when` condition
  const activePrompts = prompts.filter((prompt) => {
    if (prompt.when) {
      return prompt.when(answers);
    }
    return true;
  });

  const currentPrompt = activePrompts[currentIndex];

  const handleAnswer = useCallback(
    (value: unknown) => {
      if (!currentPrompt) return;

      const newAnswers = { ...answers, [currentPrompt.name]: value };
      setAnswers(newAnswers);

      if (currentIndex < activePrompts.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onComplete(newAnswers);
      }
    },
    [answers, currentPrompt, currentIndex, activePrompts.length, onComplete],
  );

  // Handle escape to cancel
  useInput((_input, key) => {
    if (key.escape && onCancel) {
      onCancel();
    }
  });

  if (!currentPrompt) {
    return null;
  }

  // Render the appropriate prompt type
  switch (currentPrompt.type) {
    case "text":
      return <TextPrompt prompt={currentPrompt} onSubmit={handleAnswer} />;
    case "confirm":
      return <ConfirmPrompt prompt={currentPrompt} onSubmit={handleAnswer} />;
    case "select":
      return <SelectPrompt prompt={currentPrompt} onSubmit={handleAnswer} />;
    case "multiselect":
      return (
        <MultiselectPrompt prompt={currentPrompt} onSubmit={handleAnswer} />
      );
    default:
      return (
        <Text color="red">
          Unknown prompt type: {(currentPrompt as PromptDefinition).type}
        </Text>
      );
  }
};
