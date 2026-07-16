import { render, screen } from "@testing-library/react";
import type { RequestHandler } from "msw";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import type { API } from "storybook/manager-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PARAM_KEY } from "../constants.js";
import { Panel } from "./Panel.js";

const story = vi.hoisted(() => ({
  parameters: {} as Record<string, unknown>,
}));

vi.mock("storybook/manager-api", () => ({
  useParameter: (key: string) => story.parameters[key],
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

const api = {} as API;

describe("Panel", () => {
  beforeEach(() => {
    story.parameters = {};
  });

  it("renders nothing when the panel is not active", () => {
    story.parameters = {
      [PARAM_KEY]: { handlers: [http.get("/", () => HttpResponse.json({}))] },
    };

    const { container } = render(<Panel api={api} />);

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when the story declares no handlers", () => {
    const { container } = render(<Panel api={api} active />);

    expect(container.firstChild).toBeNull();
  });

  it("lists the story's HTTP handlers", () => {
    story.parameters = {
      [PARAM_KEY]: {
        handlers: [
          http.get("/api/users", () => HttpResponse.json([])),
          http.post("/api/users", () => HttpResponse.json({})),
        ],
      },
    };

    render(<Panel api={api} active />);

    expect(screen.getByText("Active MSW Handlers")).toBeTruthy();
    expect(screen.getByText("2 handlers registered")).toBeTruthy();
    const json = screen.getByText(/"type": "HTTP Handler"/).textContent ?? "";
    expect(json.match(/"type": "HTTP Handler"/g)).toHaveLength(2);
    expect(json).toContain('"description": "Handler 1"');
    expect(json).toContain('"description": "Handler 2"');
  });

  it("uses the singular form for a single handler", () => {
    story.parameters = {
      [PARAM_KEY]: {
        handlers: [http.get("/api/users", () => HttpResponse.json([]))],
      },
    };

    render(<Panel api={api} active />);

    expect(screen.getByText("1 handler registered")).toBeTruthy();
  });

  it("labels handlers without HTTP metadata as unknown", () => {
    story.parameters = {
      [PARAM_KEY]: { handlers: [{} as RequestHandler] },
    };

    render(<Panel api={api} active />);

    expect(screen.getByText(/"type": "Unknown Handler"/)).toBeTruthy();
  });
});
