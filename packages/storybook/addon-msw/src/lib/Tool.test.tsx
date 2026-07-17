import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { API } from "storybook/manager-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KEY } from "../constants.js";
import { Tool } from "./Tool.js";

const manager = vi.hoisted(() => ({
  globals: {} as Record<string, unknown>,
  storyGlobals: {} as Record<string, unknown>,
  updateGlobals: vi.fn(),
}));

vi.mock("storybook/manager-api", () => ({
  useGlobals: () => [
    manager.globals,
    manager.updateGlobals,
    manager.storyGlobals,
  ],
}));

vi.mock("storybook/internal/components", () => ({
  ToggleButton: ({
    pressed,
    disabled,
    title,
    onClick,
    children,
  }: {
    pressed?: boolean;
    disabled?: boolean;
    title?: string;
    onClick?: () => void;
    children?: ReactNode;
  }) => (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

const api = {} as API;

describe("Tool", () => {
  beforeEach(() => {
    manager.globals = {};
    manager.storyGlobals = {};
    manager.updateGlobals.mockClear();
  });

  it("shows the active state and toggles MSW off on click", () => {
    manager.globals = { [KEY]: true };

    render(<Tool api={api} />);

    const button = screen.getByTitle("MSW Active");
    expect(button.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(button);
    expect(manager.updateGlobals).toHaveBeenCalledWith({ [KEY]: false });
  });

  it("shows the inactive state and toggles MSW on on click", () => {
    render(<Tool api={api} />);

    const button = screen.getByTitle("MSW Inactive");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button);
    expect(manager.updateGlobals).toHaveBeenCalledWith({ [KEY]: true });
  });

  it("is disabled when the story locks the global", () => {
    manager.globals = { [KEY]: true };
    manager.storyGlobals = { [KEY]: true };

    render(<Tool api={api} />);

    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("is enabled when the story does not lock the global", () => {
    render(<Tool api={api} />);

    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
  });
});
