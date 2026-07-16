import { act, render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactElement } from "react";
import type {
  Renderer,
  PartialStoryFn as StoryFunction,
} from "storybook/internal/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KEY, PARAM_KEY } from "./constants.js";

/**
 * Test harness shared with the hoisted module mocks.
 *
 * `storybook/internal/preview-api` hooks are backed by the real React hooks so
 * the decorator can be mounted as an ordinary component, while globals and
 * parameters are read from this mutable state. `msw/browser` is replaced with
 * a factory producing inspectable fake workers.
 */
const harness = vi.hoisted(() => {
  const makeWorker = () => ({
    start: vi.fn(() => Promise.resolve()),
    resetHandlers: vi.fn(),
    use: vi.fn(),
  });
  return {
    globals: {} as Record<string, unknown>,
    parameters: {} as Record<string, unknown>,
    workers: [] as ReturnType<typeof makeWorker>[],
    makeWorker,
    setupWorker: vi.fn(),
  };
});

vi.mock("msw/browser", () => ({ setupWorker: harness.setupWorker }));

vi.mock("storybook/internal/preview-api", async () => {
  const react = await vi.importActual<typeof import("react")>("react");
  return {
    useEffect: react.useEffect,
    useRef: react.useRef,
    useState: react.useState,
    useGlobals: () => [harness.globals],
    useParameter: (key: string) => harness.parameters[key],
  };
});

/**
 * The decorator holds its worker in module state (a deliberate singleton), so
 * each test imports a fresh copy of the module to start from a clean slate.
 */
const loadWithMSW = async () => {
  const module = await import("./withMSW.js");
  return module.withMSW;
};

type WithMSW = Awaited<ReturnType<typeof loadWithMSW>>;

const renderStory = (withMSW: WithMSW) => {
  const storyFn = vi.fn(() => <output>story rendered</output>);
  const Decorated = () =>
    withMSW(storyFn as unknown as StoryFunction<Renderer>) as ReactElement;
  const view = render(<Decorated />);
  return { storyFn, view };
};

describe("withMSW", () => {
  beforeEach(() => {
    vi.resetModules();
    harness.globals = { [KEY]: true };
    harness.parameters = {};
    harness.workers = [];
    harness.setupWorker.mockReset();
    harness.setupWorker.mockImplementation(() => {
      const worker = harness.makeWorker();
      harness.workers.push(worker);
      return worker;
    });
  });

  it("starts the service worker and renders the story once ready", async () => {
    const withMSW = await loadWithMSW();

    const { storyFn } = renderStory(withMSW);

    expect(await screen.findByText("story rendered")).toBeTruthy();
    expect(storyFn).toHaveBeenCalled();
    expect(harness.setupWorker).toHaveBeenCalledTimes(1);
    expect(harness.workers[0].start).toHaveBeenCalledWith({
      serviceWorker: { url: "/mockServiceWorker.js" },
      onUnhandledRequest: "bypass",
    });
    // No story handlers: the worker is reset but nothing is registered.
    expect(harness.workers[0].resetHandlers).toHaveBeenCalled();
    expect(harness.workers[0].use).not.toHaveBeenCalled();
  });

  it("resets the worker and applies the story's handlers", async () => {
    const handlers = [
      http.get("/api/users", () => HttpResponse.json([])),
      http.post("/api/users", () => HttpResponse.json({})),
    ];
    harness.parameters = { [PARAM_KEY]: { handlers } };
    const withMSW = await loadWithMSW();

    renderStory(withMSW);

    await screen.findByText("story rendered");
    const worker = harness.workers[0];
    expect(worker.use).toHaveBeenCalledWith(...handlers);
    // Stale handlers from a previous story must be cleared before re-use.
    expect(worker.resetHandlers.mock.invocationCallOrder[0]).toBeLessThan(
      worker.use.mock.invocationCallOrder[0],
    );
  });

  it("reuses the singleton worker across story mounts and swaps handlers", async () => {
    const firstHandlers = [http.get("/a", () => HttpResponse.json({}))];
    const secondHandlers = [http.get("/b", () => HttpResponse.json({}))];
    const withMSW = await loadWithMSW();

    harness.parameters = { [PARAM_KEY]: { handlers: firstHandlers } };
    const first = renderStory(withMSW);
    await screen.findByText("story rendered");
    first.view.unmount();

    harness.parameters = { [PARAM_KEY]: { handlers: secondHandlers } };
    renderStory(withMSW);
    await screen.findByText("story rendered");

    expect(harness.setupWorker).toHaveBeenCalledTimes(1);
    const worker = harness.workers[0];
    expect(worker.start).toHaveBeenCalledTimes(1);
    expect(worker.use).toHaveBeenLastCalledWith(...secondHandlers);
    // Unmounting a story clears its handlers from the shared worker.
    expect(worker.resetHandlers.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("skips MSW entirely when the story parameter disables it", async () => {
    harness.parameters = { [PARAM_KEY]: { disable: true } };
    const withMSW = await loadWithMSW();

    const { storyFn } = renderStory(withMSW);

    expect(await screen.findByText("story rendered")).toBeTruthy();
    expect(storyFn).toHaveBeenCalled();
    expect(harness.setupWorker).not.toHaveBeenCalled();
  });

  it("skips MSW entirely when globals disable it", async () => {
    harness.globals = { [KEY]: { enabled: false } };
    const withMSW = await loadWithMSW();

    renderStory(withMSW);

    expect(await screen.findByText("story rendered")).toBeTruthy();
    expect(harness.setupWorker).not.toHaveBeenCalled();
  });

  it("shows a loading indicator until the worker has started", async () => {
    let resolveStart: (() => void) | undefined;
    harness.setupWorker.mockImplementationOnce(() => {
      const worker = harness.makeWorker();
      worker.start = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveStart = resolve;
          }),
      );
      harness.workers.push(worker);
      return worker;
    });
    const withMSW = await loadWithMSW();

    const { storyFn } = renderStory(withMSW);

    expect(screen.getByText("Loading MSW...")).toBeTruthy();
    expect(storyFn).not.toHaveBeenCalled();

    await act(async () => {
      resolveStart?.();
    });

    expect(screen.getByText("story rendered")).toBeTruthy();
  });

  it("renders the story without MSW when the worker fails to start", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failure = new Error("no service worker here");
    harness.setupWorker.mockImplementationOnce(() => {
      const worker = harness.makeWorker();
      worker.start = vi.fn(() => Promise.reject(failure));
      harness.workers.push(worker);
      return worker;
    });
    const withMSW = await loadWithMSW();

    const { storyFn } = renderStory(withMSW);

    expect(await screen.findByText("story rendered")).toBeTruthy();
    expect(storyFn).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "[MSW Addon] Failed to initialize worker:",
      failure,
    );
    expect(harness.workers[0].use).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("retries worker initialization after a failed start", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    harness.setupWorker.mockImplementationOnce(() => {
      const worker = harness.makeWorker();
      worker.start = vi.fn(() => Promise.reject(new Error("boom")));
      harness.workers.push(worker);
      return worker;
    });
    const handlers = [http.get("/retry", () => HttpResponse.json({}))];
    harness.parameters = { [PARAM_KEY]: { handlers } };
    const withMSW = await loadWithMSW();

    const first = renderStory(withMSW);
    await screen.findByText("story rendered");
    first.view.unmount();

    renderStory(withMSW);
    await screen.findByText("story rendered");

    expect(harness.setupWorker).toHaveBeenCalledTimes(2);
    expect(harness.workers[1].use).toHaveBeenCalledWith(...handlers);
    warn.mockRestore();
  });

  it("does not apply handlers when unmounted during initialization", async () => {
    let resolveStart: (() => void) | undefined;
    harness.setupWorker.mockImplementationOnce(() => {
      const worker = harness.makeWorker();
      worker.start = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveStart = resolve;
          }),
      );
      harness.workers.push(worker);
      return worker;
    });
    harness.parameters = {
      [PARAM_KEY]: { handlers: [http.get("/x", () => HttpResponse.json({}))] },
    };
    const withMSW = await loadWithMSW();

    const { storyFn, view } = renderStory(withMSW);
    view.unmount();

    await act(async () => {
      resolveStart?.();
    });

    expect(storyFn).not.toHaveBeenCalled();
    expect(harness.workers[0].use).not.toHaveBeenCalled();
  });
});
