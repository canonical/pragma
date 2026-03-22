import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  collectInfoMock,
  renderInfoJsonMock,
  renderInfoLlmMock,
  renderInfoPlainMock,
} = vi.hoisted(() => ({
  collectInfoMock: vi.fn(),
  renderInfoJsonMock: vi.fn(() => "json"),
  renderInfoLlmMock: vi.fn(() => "llm"),
  renderInfoPlainMock: vi.fn(() => "plain"),
}));

vi.mock("../operations/collectInfo.js", () => ({
  default: collectInfoMock,
}));

vi.mock("../formatters/index.js", () => ({
  renderInfoJson: renderInfoJsonMock,
  renderInfoLlm: renderInfoLlmMock,
  renderInfoPlain: renderInfoPlainMock,
}));

import infoCommand from "./info.js";

describe("infoCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectInfoMock.mockResolvedValue({ version: "1.0.0" });
  });

  it("has path ['info']", () => {
    expect(infoCommand.path).toEqual(["info"]);
  });

  it("has a description", () => {
    expect(infoCommand.description).toBeTruthy();
  });

  it("has no parameters", () => {
    expect(infoCommand.parameters).toEqual([]);
  });

  it("has an execute function", () => {
    expect(typeof infoCommand.execute).toBe("function");
  });

  it("uses the plain renderer by default", async () => {
    const result = await infoCommand.execute(
      {},
      { cwd: "/workspace", globalFlags: { llm: false, format: "text" } },
    );

    expect(collectInfoMock).toHaveBeenCalledWith("/workspace");
    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("plain");
      expect(renderInfoPlainMock).toHaveBeenCalledWith({ version: "1.0.0" });
    }
  });

  it("uses the llm renderer when llm output is requested", async () => {
    const result = await infoCommand.execute(
      {},
      { cwd: "/workspace", globalFlags: { llm: true, format: "text" } },
    );

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("llm");
      expect(renderInfoLlmMock).toHaveBeenCalledWith({ version: "1.0.0" });
    }
  });

  it("prefers the json renderer over llm mode", async () => {
    const result = await infoCommand.execute(
      {},
      { cwd: "/workspace", globalFlags: { llm: true, format: "json" } },
    );

    expect(result.tag).toBe("output");
    if (result.tag === "output") {
      expect(result.render.plain(result.value)).toBe("json");
      expect(renderInfoJsonMock).toHaveBeenCalledWith({ version: "1.0.0" });
    }
  });
});
