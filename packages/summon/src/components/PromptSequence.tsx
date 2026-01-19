/**
 * PromptSequence Component
 *
 * Handles interactive prompts for generators using React Ink.
 * Features:
 * - Progress indicator (step X of Y)
 * - Navigate back to previous answers
 * - Show completed answers
 * - Group headers
 */

import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useState } from "react";
import type { PromptDefinition } from "../types.js";

export interface PromptSequenceProps {
  /** List of prompts to display */
  prompts: PromptDefinition[];
  /** Called when all prompts are answered */
  onComplete: (answers: Record<string, unknown>) => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Initial answers (for resuming/editing) */
  initialAnswers?: Record<string, unknown>;
}

// =============================================================================
// Helper to format answer values for display
// =============================================================================

const formatAnswerValue = (
  value: unknown,
  prompt: PromptDefinition,
): string => {
  if (value === undefined || value === null) return "";

  if (prompt.type === "confirm") {
    return value ? "Yes" : "No";
  }

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

// =============================================================================
// Completed Answer Display
// =============================================================================

interface CompletedAnswerProps {
  prompt: PromptDefinition;
  value: unknown;
  isEditing?: boolean;
}

const CompletedAnswer = ({
  prompt,
  value,
  isEditing = false,
}: CompletedAnswerProps) => {
  const displayValue = formatAnswerValue(value, prompt);

  return (
    <Box>
      <Text color="green">✔ </Text>
      <Text dimColor={!isEditing}>{prompt.message} </Text>
      <Text color={isEditing ? "yellow" : "cyan"}>{displayValue}</Text>
    </Box>
  );
};

// =============================================================================
// Text Prompt
// =============================================================================

interface TextPromptProps {
  prompt: PromptDefinition;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onBack?: () => void;
}

const TextPrompt = ({
  prompt,
  initialValue,
  onSubmit,
  onBack,
}: TextPromptProps) => {
  const [value, setValue] = useState(
    initialValue ?? String(prompt.default ?? ""),
  );
  const [error, setError] = useState<string | null>(null);

  // Reset value when prompt changes
  useEffect(() => {
    setValue(initialValue ?? String(prompt.default ?? ""));
    setError(null);
  }, [initialValue, prompt.default]);

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

  // Handle back navigation with Escape
  useInput((_input, key) => {
    if (key.escape && onBack) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta">› </Text>
        <Text bold>{prompt.message}</Text>
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

// =============================================================================
// Confirm Prompt
// =============================================================================

interface ConfirmPromptProps {
  prompt: PromptDefinition;
  onSubmit: (value: boolean) => void;
  onBack?: () => void;
}

const ConfirmPrompt = ({ prompt, onSubmit, onBack }: ConfirmPromptProps) => {
  const defaultValue = Boolean(prompt.default);

  useInput((input, key) => {
    if (input.toLowerCase() === "y") {
      onSubmit(true);
    } else if (input.toLowerCase() === "n") {
      onSubmit(false);
    } else if (key.return) {
      onSubmit(defaultValue);
    } else if (key.escape && onBack) {
      onBack();
    }
  });

  const hint = defaultValue ? "Y/n" : "y/N";

  return (
    <Box>
      <Text color="magenta">› </Text>
      <Text bold>{prompt.message} </Text>
      <Text dimColor>({hint})</Text>
    </Box>
  );
};

// =============================================================================
// Select Prompt
// =============================================================================

interface SelectPromptProps {
  prompt: PromptDefinition;
  onSubmit: (value: string) => void;
  onBack?: () => void;
}

const SelectPrompt = ({ prompt, onSubmit, onBack }: SelectPromptProps) => {
  const items =
    prompt.choices?.map((choice) => ({
      label: choice.label,
      value: choice.value,
    })) ?? [];

  // Find initial index based on default value
  const initialIndex = prompt.default
    ? items.findIndex((item) => item.value === prompt.default)
    : 0;

  useInput((_input, key) => {
    if (key.escape && onBack) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="magenta">› </Text>
        <Text bold>{prompt.message}</Text>
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

// =============================================================================
// Multiselect Prompt
// =============================================================================

interface MultiselectPromptProps {
  prompt: PromptDefinition;
  onSubmit: (values: string[]) => void;
  onBack?: () => void;
}

const MultiselectPrompt = ({
  prompt,
  onSubmit,
  onBack,
}: MultiselectPromptProps) => {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(prompt.default as string[] | undefined),
  );
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const choices = prompt.choices ?? [];

  useInput((input, key) => {
    if (key.escape && onBack) {
      onBack();
      return;
    }
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
        <Text color="magenta">› </Text>
        <Text bold>{prompt.message}</Text>
        <Text dimColor> (space to toggle, enter to confirm)</Text>
      </Box>
      <Box marginLeft={2} flexDirection="column">
        {choices.map((choice, i) => {
          const isHighlighted = i === highlightedIndex;
          const isSelected = selected.has(choice.value);
          const pointer = isHighlighted ? "› " : "  ";
          const checkbox = isSelected ? "◉ " : "○ ";

          return (
            <Box key={choice.value}>
              <Text color={isHighlighted ? "magenta" : undefined}>
                {pointer}
              </Text>
              <Text color={isSelected ? "green" : "gray"}>{checkbox}</Text>
              <Text color={isSelected ? undefined : "gray"}>
                {choice.label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// =============================================================================
// Progress Header
// =============================================================================

interface ProgressHeaderProps {
  current: number;
  total: number;
  group?: string;
}

const ProgressHeader = ({ current, total, group }: ProgressHeaderProps) => {
  return (
    <Box marginBottom={1}>
      <Text dimColor>
        {group ? `${group} · ` : ""}Step {current} of {total}
        {" · "}
        <Text dimColor italic>
          esc to go back
        </Text>
      </Text>
    </Box>
  );
};

// =============================================================================
// Main PromptSequence Component
// =============================================================================

export const PromptSequence = ({
  prompts,
  onComplete,
  onCancel,
  initialAnswers,
}: PromptSequenceProps) => {
  // Always start at index 0, but preserve answers for display/editing
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(
    initialAnswers ?? {},
  );
  // Track the history of prompt indices for back navigation
  const [history, setHistory] = useState<number[]>([]);

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
        setHistory((prev) => [...prev, currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      } else {
        onComplete(newAnswers);
      }
    },
    [answers, currentPrompt, currentIndex, activePrompts.length, onComplete],
  );

  const handleBack = useCallback(() => {
    if (history.length > 0) {
      const prevIndex = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setCurrentIndex(prevIndex);
    } else if (onCancel) {
      onCancel();
    }
  }, [history, onCancel]);

  if (!currentPrompt) {
    return null;
  }

  // Get previously completed prompts to display
  const completedPrompts = activePrompts.slice(0, currentIndex);

  // Render the appropriate prompt type
  const renderCurrentPrompt = () => {
    const existingValue = answers[currentPrompt.name];

    switch (currentPrompt.type) {
      case "text":
        return (
          <TextPrompt
            prompt={currentPrompt}
            initialValue={existingValue as string | undefined}
            onSubmit={handleAnswer}
            onBack={handleBack}
          />
        );
      case "confirm":
        return (
          <ConfirmPrompt
            prompt={currentPrompt}
            onSubmit={handleAnswer}
            onBack={handleBack}
          />
        );
      case "select":
        return (
          <SelectPrompt
            prompt={currentPrompt}
            onSubmit={handleAnswer}
            onBack={handleBack}
          />
        );
      case "multiselect":
        return (
          <MultiselectPrompt
            prompt={currentPrompt}
            onSubmit={handleAnswer}
            onBack={handleBack}
          />
        );
      default:
        return (
          <Text color="red">
            Unknown prompt type: {(currentPrompt as PromptDefinition).type}
          </Text>
        );
    }
  };

  return (
    <Box flexDirection="column">
      {/* Progress indicator */}
      <ProgressHeader
        current={currentIndex + 1}
        total={activePrompts.length}
        group={currentPrompt.group}
      />

      {/* Show completed answers */}
      {completedPrompts.map((prompt) => (
        <CompletedAnswer
          key={prompt.name}
          prompt={prompt}
          value={answers[prompt.name]}
        />
      ))}

      {/* Current prompt */}
      {renderCurrentPrompt()}
    </Box>
  );
};
