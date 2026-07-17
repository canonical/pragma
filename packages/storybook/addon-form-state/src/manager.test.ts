import type { ReactElement } from "react";
import { addons, types } from "storybook/manager-api";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ADDON_ID, PANEL_ID } from "./constants.js";
import { Panel } from "./lib/Panel.js";
import "./manager.js";

vi.mock("storybook/manager-api", () => ({
  addons: { register: vi.fn(), add: vi.fn() },
  types: { PANEL: "panel", TOOL: "tool" },
  useChannel: vi.fn(() => vi.fn()),
}));

vi.mock("storybook/internal/components", () => ({
  AddonPanel: () => null,
  SyntaxHighlighter: () => null,
}));

/** The addon config shape this suite inspects, independent of manager types. */
interface RegisteredAddon {
  type: unknown;
  title: string;
  match?: (options: { viewMode?: string }) => boolean;
  render?: (options: { active?: boolean }) => ReactElement;
}

const registeredAddon = (): RegisteredAddon => {
  const call = vi.mocked(addons.add).mock.calls[0];
  if (!call) {
    throw new Error("addons.add was not called");
  }
  expect(call[0]).toBe(PANEL_ID);
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
    (call[1] as (api: unknown) => void)(undefined);
  });

  it("registers the addon under its id", () => {
    expect(addons.register).toHaveBeenCalledTimes(1);
    expect(vi.mocked(addons.register).mock.calls[0]?.[0]).toBe(ADDON_ID);
  });

  it("adds a Form State panel", () => {
    expect(addons.add).toHaveBeenCalledTimes(1);
    const config = registeredAddon();
    expect(config.type).toBe(types.PANEL);
    expect(config.title).toBe("Form State");
  });

  it("only matches the story view mode", () => {
    const config = registeredAddon();
    expect(config.match?.({ viewMode: "story" })).toBe(true);
    expect(config.match?.({ viewMode: "docs" })).toBe(false);
    expect(config.match?.({})).toBe(false);
  });

  it("renders the Panel with the active flag", () => {
    const config = registeredAddon();
    const element = config.render?.({ active: true });
    expect(element?.type).toBe(Panel);
    expect(element?.props).toEqual({ active: true });
  });
});
