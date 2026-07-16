import type { ReactElement } from "react";
import { type API, addons, types } from "storybook/manager-api";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ADDON_ID, PANEL_ID, TOOL_ID } from "./constants.js";
import { Panel } from "./lib/Panel.js";
import { Tool } from "./lib/Tool.js";
import "./manager.js";

vi.mock("storybook/manager-api", () => ({
  addons: { register: vi.fn(), add: vi.fn() },
  types: { PANEL: "panel", TOOL: "tool" },
  useGlobals: vi.fn(() => [{}, vi.fn(), {}]),
  useParameter: vi.fn(),
}));

vi.mock("storybook/internal/components", () => ({
  AddonPanel: () => null,
  SyntaxHighlighter: () => null,
  ToggleButton: () => null,
}));

/** The addon config shape this suite inspects, independent of manager types. */
interface RegisteredAddon {
  type: unknown;
  title: string;
  match?: (options: { viewMode?: string }) => boolean;
  render?: (options: { active?: boolean }) => ReactElement;
}

const api = { fake: "api" } as unknown as API;

const registeredAddon = (id: string): RegisteredAddon => {
  const call = vi
    .mocked(addons.add)
    .mock.calls.find(([addonId]) => addonId === id);
  if (!call) {
    throw new Error(`addons.add was not called for ${id}`);
  }
  return call[1] as unknown as RegisteredAddon;
};

describe("manager", () => {
  beforeAll(() => {
    // Importing the manager entry registers the addon; Storybook then invokes
    // the registration callback, which this suite does by hand.
    const call = vi.mocked(addons.register).mock.calls[0];
    if (!call) {
      throw new Error("addons.register was not called");
    }
    (call[1] as (api: API) => void)(api);
  });

  it("registers the addon under its id", () => {
    expect(addons.register).toHaveBeenCalledTimes(1);
    expect(vi.mocked(addons.register).mock.calls[0]?.[0]).toBe(ADDON_ID);
  });

  it("adds a toolbar toggle for stories and docs", () => {
    const tool = registeredAddon(TOOL_ID);
    expect(tool.type).toBe(types.TOOL);
    expect(tool.title).toBe("Toggle MSW");
    expect(tool.match?.({ viewMode: "story" })).toBe(true);
    expect(tool.match?.({ viewMode: "docs" })).toBe(true);
    expect(tool.match?.({ viewMode: "settings" })).toBe(false);
    expect(tool.match?.({})).toBe(false);
  });

  it("renders the toolbar Tool bound to the manager API", () => {
    const tool = registeredAddon(TOOL_ID);
    const element = tool.render?.({});
    expect(element?.type).toBe(Tool);
    expect(element?.props).toEqual({ api });
  });

  it("adds a handlers panel for stories only", () => {
    const panel = registeredAddon(PANEL_ID);
    expect(panel.type).toBe(types.PANEL);
    expect(panel.title).toBe("MSW");
    expect(panel.match?.({ viewMode: "story" })).toBe(true);
    expect(panel.match?.({ viewMode: "docs" })).toBe(false);
    expect(panel.match?.({})).toBe(false);
  });

  it("renders the Panel with the manager API and active flag", () => {
    const panel = registeredAddon(PANEL_ID);
    const element = panel.render?.({ active: true });
    expect(element?.type).toBe(Panel);
    expect(element?.props).toEqual({ api, active: true });
  });
});
