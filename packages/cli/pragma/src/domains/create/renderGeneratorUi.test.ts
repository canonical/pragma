import type { CommandContext } from "@canonical/cli-core";
import type { GeneratorDefinition } from "@canonical/summon-core";
import { afterEach, describe, expect, it, vi } from "vitest";

const executeGeneratorMock = vi.fn(async () => ({
  tag: "output" as const,
  value: "",
  render: { plain: () => "" },
}));
const renderAppMock = vi.fn(async () => {});

vi.mock("@canonical/cli-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@canonical/cli-core")>();
  return {
    ...actual,
    executeGenerator: executeGeneratorMock,
    createGeneratorStamp: () => ({ generatorName: "g", version: "1" }),
  };
});

vi.mock("@canonical/summon/ui", () => ({ renderApp: renderAppMock }));

const gen = {
  meta: {},
  prompts: [],
  generate: () => ({}),
} as unknown as GeneratorDefinition;

function makeCtx(overrides: Partial<CommandContext["globalFlags"]> = {}) {
  return {
    cwd: "/tmp",
    globalFlags: { llm: false, format: "text", verbose: false, ...overrides },
  } as CommandContext;
}

async function withTty<T>(
  stdin: boolean,
  stdout: boolean,
  run: () => Promise<T>,
): Promise<T> {
  const inPrev = process.stdin.isTTY;
  const outPrev = process.stdout.isTTY;
  Object.defineProperty(process.stdin, "isTTY", {
    value: stdin,
    configurable: true,
  });
  Object.defineProperty(process.stdout, "isTTY", {
    value: stdout,
    configurable: true,
  });
  try {
    return await run();
  } finally {
    Object.defineProperty(process.stdin, "isTTY", {
      value: inPrev,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: outPrev,
      configurable: true,
    });
  }
}

describe("renderGeneratorUi", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders summon's Ink UI on an interactive terminal", async () => {
    const { default: renderGeneratorUi } = await import(
      "./renderGeneratorUi.js"
    );
    const result = await withTty(true, true, () =>
      renderGeneratorUi(gen, {}, makeCtx()),
    );
    expect(renderAppMock).toHaveBeenCalledTimes(1);
    expect(executeGeneratorMock).not.toHaveBeenCalled();
    expect(result).toEqual({ tag: "exit", code: 0 });
  });

  it("falls back to executeGenerator on a non-interactive terminal", async () => {
    const { default: renderGeneratorUi } = await import(
      "./renderGeneratorUi.js"
    );
    await withTty(false, false, () => renderGeneratorUi(gen, {}, makeCtx()));
    expect(executeGeneratorMock).toHaveBeenCalledTimes(1);
    expect(renderAppMock).not.toHaveBeenCalled();
  });

  it.each([
    ["--yes", { yes: true }],
    ["--dry-run", { dryRun: true }],
    ["--undo", { undo: true }],
    ["--llm", { llm: true }],
    ["--format json", { format: "json" }],
  ])("falls back to executeGenerator for %s even on a TTY", async (_label, params) => {
    const { default: renderGeneratorUi } = await import(
      "./renderGeneratorUi.js"
    );
    await withTty(true, true, () => renderGeneratorUi(gen, params, makeCtx()));
    expect(executeGeneratorMock).toHaveBeenCalledTimes(1);
    expect(renderAppMock).not.toHaveBeenCalled();
  });
});
