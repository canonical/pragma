import { describe, expect, it, vi } from "vitest";
import { KEY } from "./constants.js";
import preview from "./preview.js";
import { withMSW } from "./withMSW.js";

// `withMSW` imports `msw/browser`; keep the worker factory out of this suite.
vi.mock("msw/browser", () => ({ setupWorker: vi.fn() }));

describe("preview", () => {
  it("registers the MSW decorator in the Storybook preview config", () => {
    expect(preview.decorators).toEqual([withMSW]);
  });

  it("enables MSW by default through its global", () => {
    expect(preview.initialGlobals?.[KEY]).toBe(true);
  });
});
