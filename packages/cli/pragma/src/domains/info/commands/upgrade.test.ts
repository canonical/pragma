import { execSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  readConfigMock,
  detectPackageManagerMock,
  renderUpgradeJsonMock,
  renderUpgradeLlmMock,
  renderUpgradePlainMock,
  checkRegistryVersionMock,
} = vi.hoisted(() => ({
  readConfigMock: vi.fn(),
  detectPackageManagerMock: vi.fn(),
  renderUpgradeJsonMock: vi.fn(() => "json"),
  renderUpgradeLlmMock: vi.fn(() => "llm"),
  renderUpgradePlainMock: vi.fn(() => "plain"),
  checkRegistryVersionMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("#config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("#config")>()),
  readConfig: readConfigMock,
}));

vi.mock("#package-manager", async (importOriginal) => {
  const actual = await importOriginal<typeof import("#package-manager")>();
  return {
    ...actual,
    detectPackageManager: detectPackageManagerMock,
    PM_COMMANDS: {
      ...actual.PM_COMMANDS,
      bun: {
        ...actual.PM_COMMANDS.bun,
        update: (pkg: string) => `bun update ${pkg}`,
      },
    },
  };
});

vi.mock("../formatters/index.js", () => ({
  renderUpgradeJson: renderUpgradeJsonMock,
  renderUpgradeLlm: renderUpgradeLlmMock,
  renderUpgradePlain: renderUpgradePlainMock,
}));

vi.mock("../operations/checkRegistryVersion.js", () => ({
  default: checkRegistryVersionMock,
}));

import upgradeCommand from "./upgrade.js";

describe("upgradeCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detectPackageManagerMock.mockReturnValue("bun");
    readConfigMock.mockReturnValue({ tier: undefined, channel: "normal" });
  });

  it("has path ['upgrade']", () => {
    expect(upgradeCommand.path).toEqual(["upgrade"]);
  });

  it("has a description", () => {
    expect(upgradeCommand.description).toBeTruthy();
  });

  it("has dryRun parameter", () => {
    expect(upgradeCommand.parameters).toHaveLength(1);
    expect(upgradeCommand.parameters[0].name).toBe("dryRun");
    expect(upgradeCommand.parameters[0].type).toBe("boolean");
    expect(upgradeCommand.parameters[0].default).toBe(false);
  });

  it("has an execute function", () => {
    expect(typeof upgradeCommand.execute).toBe("function");
  });

  it("returns offline upgrade information when registry lookup fails", async () => {
    checkRegistryVersionMock.mockResolvedValue(undefined);

    const result = await upgradeCommand.execute(
      {},
      { cwd: "/workspace", globalFlags: { llm: false, format: "text" } },
    );

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("plain");
      expect(renderUpgradePlainMock).toHaveBeenCalledWith(
        expect.objectContaining({ offline: true, executed: false }),
      );
    }
  });

  it("returns already-latest information when versions match", async () => {
    const { VERSION } = await import("#constants");
    checkRegistryVersionMock.mockResolvedValue({
      latest: VERSION,
      distTag: "latest",
    });

    const result = await upgradeCommand.execute(
      {},
      { cwd: "/workspace", globalFlags: { llm: true, format: "text" } },
    );

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("llm");
      expect(renderUpgradeLlmMock).toHaveBeenCalledWith(
        expect.objectContaining({ alreadyLatest: true, offline: false }),
      );
    }
  });

  it("does not execute the upgrade command during dry runs", async () => {
    checkRegistryVersionMock.mockResolvedValue({
      latest: "9.9.9",
      distTag: "latest",
    });

    const result = await upgradeCommand.execute(
      { dryRun: true },
      { cwd: "/workspace", globalFlags: { llm: true, format: "json" } },
    );

    expect(execSync).not.toHaveBeenCalled();
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("json");
      expect(renderUpgradeJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true, executed: false }),
      );
    }
  });

  it("executes the upgrade command when needed", async () => {
    checkRegistryVersionMock.mockResolvedValue({
      latest: "9.9.9",
      distTag: "latest",
    });

    const result = await upgradeCommand.execute(
      {},
      { cwd: "/workspace", globalFlags: { llm: false, format: "text" } },
    );

    expect(execSync).toHaveBeenCalledWith("bun update @canonical/pragma-cli", {
      stdio: "inherit",
    });
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("plain");
      expect(renderUpgradePlainMock).toHaveBeenCalledWith(
        expect.objectContaining({ executed: true, offline: false }),
      );
    }
  });

  it("throws a pragma error when the upgrade command fails", async () => {
    checkRegistryVersionMock.mockResolvedValue({
      latest: "9.9.9",
      distTag: "latest",
    });
    const execSyncMock = execSync as unknown as {
      mockImplementation: (fn: () => never) => unknown;
    };
    execSyncMock.mockImplementation(() => {
      throw new Error("permission denied");
    });

    await expect(
      upgradeCommand.execute(
        {},
        { cwd: "/workspace", globalFlags: { llm: false, format: "text" } },
      ),
    ).rejects.toThrow("Upgrade command failed: permission denied");
  });
});
