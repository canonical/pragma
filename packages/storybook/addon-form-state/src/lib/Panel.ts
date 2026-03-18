import { createElement, memo, useState } from "react";
import { AddonPanel, SyntaxHighlighter } from "storybook/internal/components";
import { useChannel } from "storybook/manager-api";
import { EVENT_FORM_STATE } from "../constants.js";

interface FormStatePayload {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  dirtyFields: Record<string, boolean>;
  touchedFields: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

interface PanelProps {
  active?: boolean;
}

export const Panel = memo(function FormStatePanel({ active }: PanelProps) {
  const [state, setState] = useState<FormStatePayload | null>(null);

  useChannel({
    [EVENT_FORM_STATE]: (payload: FormStatePayload) => setState(payload),
  });

  if (!active) {
    return null;
  }

  if (!state) {
    const children = createElement(
      "div",
      { style: { padding: "1rem", opacity: 0.5 } },
      "No form state — this story may not use the form decorator.",
    );
    return createElement(AddonPanel, { active, children });
  }

  const statusText = [
    state.isValid ? "valid" : "invalid",
    state.isDirty ? "dirty" : "pristine",
    state.submitCount > 0 ? `${state.submitCount} submit(s)` : null,
    state.isSubmitting ? "submitting…" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasErrors = Object.keys(state.errors).length > 0;
  const hasDirty = Object.keys(state.dirtyFields).length > 0;
  const hasTouched = Object.keys(state.touchedFields).length > 0;

  const sections: { label: string; data: unknown; show: boolean }[] = [
    { label: "Values", data: state.values, show: true },
    { label: "Errors", data: state.errors, show: hasErrors },
    { label: "Dirty Fields", data: state.dirtyFields, show: hasDirty },
    { label: "Touched Fields", data: state.touchedFields, show: hasTouched },
  ];

  const children = createElement(
    "div",
    { style: { padding: "1rem" } },
    createElement(
      "div",
      {
        style: {
          marginBottom: "0.75rem",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          opacity: 0.7,
        },
      },
      statusText,
    ),
    ...sections
      .filter((s) => s.show)
      .map((section) =>
        createElement(
          "div",
          { key: section.label, style: { marginBottom: "1rem" } },
          createElement(
            "h4",
            { style: { margin: "0 0 0.25rem", fontSize: "0.85rem" } },
            section.label,
          ),
          createElement(
            SyntaxHighlighter,
            { language: "json" },
            JSON.stringify(section.data, null, 2),
          ),
        ),
      ),
  );

  return createElement(AddonPanel, { active, children });
});
