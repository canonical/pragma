import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_FORM_STATE } from "../constants.js";
import { Panel } from "./Panel.js";

const channel = vi.hoisted(() => ({
  handlers: {} as Record<string, (payload: unknown) => void>,
}));

vi.mock("storybook/manager-api", () => ({
  useChannel: (events: Record<string, (payload: unknown) => void>) => {
    channel.handlers = events;
    return vi.fn();
  },
}));

vi.mock("storybook/internal/components", () => ({
  AddonPanel: ({
    active,
    children,
  }: {
    active?: boolean;
    children?: ReactNode;
  }) => (active ? <div>{children}</div> : null),
  SyntaxHighlighter: ({ children }: { children?: ReactNode }) => (
    <pre>{children}</pre>
  ),
}));

const basePayload = {
  values: { name: "Ada" },
  errors: {},
  dirtyFields: {},
  touchedFields: {},
  isValid: true,
  isDirty: false,
  isSubmitting: false,
  submitCount: 0,
};

/** Delivers a form-state event the way the preview-side emitter would. */
const emitFormState = (payload: Record<string, unknown>) => {
  act(() => {
    channel.handlers[EVENT_FORM_STATE]?.(payload);
  });
};

describe("Panel", () => {
  beforeEach(() => {
    channel.handlers = {};
  });

  it("renders nothing when the panel is not active", () => {
    const { container } = render(<Panel />);

    expect(container.firstChild).toBeNull();
  });

  it("shows a placeholder before any form state arrives", () => {
    render(<Panel active />);

    expect(
      screen.getByText(/No form state — this story may not use the form/),
    ).toBeTruthy();
  });

  it("renders the status line and values once a form-state event arrives", () => {
    render(<Panel active />);

    emitFormState(basePayload);

    expect(screen.getByText("valid · pristine")).toBeTruthy();
    expect(screen.getByText("Values")).toBeTruthy();
    expect(screen.getByText(/"name": "Ada"/)).toBeTruthy();
    // Empty sections stay hidden.
    expect(screen.queryByText("Errors")).toBeNull();
    expect(screen.queryByText("Dirty Fields")).toBeNull();
    expect(screen.queryByText("Touched Fields")).toBeNull();
  });

  it("renders error, dirty and touched sections when populated", () => {
    render(<Panel active />);

    emitFormState({
      ...basePayload,
      errors: { "user.name": "Name is required" },
      dirtyFields: { name: true },
      touchedFields: { name: true },
      isValid: false,
      isDirty: true,
      isSubmitting: true,
      submitCount: 2,
    });

    expect(
      screen.getByText("invalid · dirty · 2 submit(s) · submitting…"),
    ).toBeTruthy();
    expect(screen.getByText("Errors")).toBeTruthy();
    expect(screen.getByText(/"user.name": "Name is required"/)).toBeTruthy();
    expect(screen.getByText("Dirty Fields")).toBeTruthy();
    expect(screen.getByText("Touched Fields")).toBeTruthy();
  });

  it("replaces the displayed state when subsequent events arrive", () => {
    render(<Panel active />);

    emitFormState(basePayload);
    emitFormState({ ...basePayload, values: { name: "Grace" } });

    expect(screen.getByText(/"name": "Grace"/)).toBeTruthy();
    expect(screen.queryByText(/"name": "Ada"/)).toBeNull();
  });
});
