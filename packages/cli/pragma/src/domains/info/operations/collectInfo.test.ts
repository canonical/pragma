import { beforeEach, describe, expect, it, vi } from "vitest";

const readConfigMock = vi.fn();
const detectInstallSourceMock = vi.fn();
const bootStoreMock = vi.fn();
const checkRegistryVersionMock = vi.fn();
const collectStoreSummaryMock = vi.fn();

vi.mock("#config", () => ({
  readConfig: readConfigMock,
}));

vi.mock("#package-manager", () => ({
  detectInstallSource: detectInstallSourceMock,
  PM_COMMANDS: {
    bun: {
      update: (pkg: string) => `bun update ${pkg}`,
    },
  },
}));

vi.mock("../../shared/bootStore.js", () => ({
  bootStore: bootStoreMock,
}));

vi.mock("./checkRegistryVersion.js", () => ({
  default: checkRegistryVersionMock,
}));

vi.mock("./collectStoreSummary.js", () => ({
  collectStoreSummary: collectStoreSummaryMock,
}));

describe("collectInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detectInstallSourceMock.mockReturnValue({
      packageManager: "bun",
      scope: "global",
      label: "bun (global)",
    });
    readConfigMock.mockReturnValue({ tier: "apps/lxd", channel: "normal" });
  });

  it("includes update information and store summary when available", async () => {
    const dispose = vi.fn();
    bootStoreMock.mockResolvedValue({ dispose });
    checkRegistryVersionMock.mockResolvedValue({
      latest: "9.9.9",
      distTag: "latest",
    });
    collectStoreSummaryMock.mockResolvedValue({
      tripleCount: 42,
      graphNames: ["default"],
    });

    const { default: collectInfo } = await import("./collectInfo.js");
    const result = await collectInfo("/workspace");

    expect(result.update).toEqual({
      current: expect.any(String),
      latest: "9.9.9",
      command: "bun update @canonical/pragma",
    });
    expect(result.installSource).toBe("bun (global)");
    expect(result.updateSkipped).toBe(false);
    expect(result.store).toEqual({ tripleCount: 42, graphNames: ["default"] });
    expect(result.tierChain.length).toBeGreaterThan(0);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("marks update as skipped and omits store when registry and store are unavailable", async () => {
    checkRegistryVersionMock.mockResolvedValue(undefined);
    bootStoreMock.mockRejectedValue(new Error("store unavailable"));

    const { default: collectInfo } = await import("./collectInfo.js");
    const result = await collectInfo("/workspace");

    expect(result.update).toBeUndefined();
    expect(result.updateSkipped).toBe(true);
    expect(result.store).toBeUndefined();
  });

  it("omits the update section when already on the latest version", async () => {
    const { VERSION } = await import("#constants");
    const dispose = vi.fn();
    bootStoreMock.mockResolvedValue({ dispose });
    checkRegistryVersionMock.mockResolvedValue({
      latest: VERSION,
      distTag: "latest",
    });
    collectStoreSummaryMock.mockResolvedValue({
      tripleCount: 10,
      graphNames: ["default"],
    });

    const { default: collectInfo } = await import("./collectInfo.js");
    const result = await collectInfo("/workspace");

    expect(result.update).toBeUndefined();
    expect(result.updateSkipped).toBe(false);
    expect(result.store?.tripleCount).toBe(10);
  });
});
