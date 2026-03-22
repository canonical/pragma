import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectFormatterMock, runChecksMock } = vi.hoisted(() => ({
  selectFormatterMock: vi.fn(
    () => (data: { passed: number }) => `passed=${data.passed}`,
  ),
  runChecksMock: vi.fn(),
}));

vi.mock("../../shared/formatters.js", () => ({
  selectFormatter: selectFormatterMock,
}));

vi.mock("../operations/index.js", () => ({
  runChecks: runChecksMock,
}));

import doctorCommand from "./doctor.js";

describe("doctorCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it("has path ['doctor']", () => {
    expect(doctorCommand.path).toEqual(["doctor"]);
  });

  it("has a description", () => {
    expect(doctorCommand.description).toBeTruthy();
  });

  it("has no parameters", () => {
    expect(doctorCommand.parameters).toEqual([]);
  });

  it("has an execute function", () => {
    expect(typeof doctorCommand.execute).toBe("function");
  });

  it("returns formatted output without setting an error exit code when checks pass", async () => {
    runChecksMock.mockResolvedValue({ checks: [], passed: 2, failed: 0 });

    const result = await doctorCommand.execute(
      {},
      {
        cwd: "/workspace",
        globalFlags: { llm: false, format: "text", verbose: false },
      },
    );

    expect(runChecksMock).toHaveBeenCalledWith({ cwd: "/workspace" });
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("passed=2");
    }
    expect(process.exitCode).toBeUndefined();
  });

  it("sets exitCode when checks fail", async () => {
    runChecksMock.mockResolvedValue({ checks: [], passed: 1, failed: 1 });

    await doctorCommand.execute(
      {},
      {
        cwd: "/workspace",
        globalFlags: { llm: true, format: "json", verbose: false },
      },
    );

    expect(selectFormatterMock).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
