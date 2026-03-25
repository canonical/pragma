import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const detectLocalInstallMock = vi.fn();
const runCliMock = vi.fn(async () => undefined);

vi.mock("./package-manager/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./package-manager/index.js")>()),
  detectLocalInstall: detectLocalInstallMock,
}));

vi.mock("./pipeline/runCli.js", () => ({
  default: runCliMock,
}));

describe("bin", () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    vi.clearAllMocks();
    process.argv = ["bun", "pragma", "block", "list"];
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  it("warns when a local install is detected and forwards argv to runCli", async () => {
    vi.resetModules();
    detectLocalInstallMock.mockReturnValue("Use local pragma install");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("./bin.ts");

    expect(warnSpy).toHaveBeenCalledWith("Use local pragma install");
    expect(runCliMock).toHaveBeenCalledWith(process.argv);

    warnSpy.mockRestore();
  });

  it("does not warn when no local install warning is needed", async () => {
    vi.resetModules();
    detectLocalInstallMock.mockReturnValue(undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("./bin.ts");

    expect(warnSpy).not.toHaveBeenCalled();
    expect(runCliMock).toHaveBeenCalledWith(process.argv);

    warnSpy.mockRestore();
  });
});
