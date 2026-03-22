import { describe, expect, it } from "vitest";
import type { InfoData } from "../types.js";
import { renderInfoJson, renderInfoLlm, renderInfoPlain } from "./info.js";

function createInfoData(overrides: Partial<InfoData> = {}): InfoData {
  return {
    version: "0.18.0",
    pm: "bun",
    configPath: "pragma.config.json",
    tier: "apps/lxd",
    tierChain: ["global", "apps", "apps/lxd"],
    channel: "normal",
    channelReleases: ["stable"],
    update: undefined,
    updateSkipped: false,
    store: { tripleCount: 12847, graphNames: ["urn:pragma:standards"] },
    ...overrides,
  };
}

describe("renderInfoPlain", () => {
  it("includes version", () => {
    const output = renderInfoPlain(createInfoData());
    expect(output).toContain("pragma v0.18.0");
  });

  it("includes install method", () => {
    const output = renderInfoPlain(createInfoData());
    expect(output).toContain("bun (global)");
  });

  it("includes tier chain", () => {
    const output = renderInfoPlain(createInfoData());
    expect(output).toContain("global → apps → apps/lxd");
  });

  it("shows (none) when tier is undefined", () => {
    const output = renderInfoPlain(
      createInfoData({ tier: undefined, tierChain: [] }),
    );
    expect(output).toContain("(none)");
  });

  it("includes channel with releases", () => {
    const output = renderInfoPlain(createInfoData());
    expect(output).toContain("normal");
    expect(output).toContain("stable");
  });

  it("shows update available", () => {
    const output = renderInfoPlain(
      createInfoData({
        update: {
          current: "0.18.0",
          latest: "0.19.0",
          command: "bun update -g @canonical/pragma",
        },
      }),
    );
    expect(output).toContain("0.19.0");
    expect(output).toContain("pragma upgrade");
  });

  it("shows up to date when no update", () => {
    const output = renderInfoPlain(createInfoData());
    expect(output).toContain("Up to date");
  });

  it("shows offline fallback", () => {
    const output = renderInfoPlain(createInfoData({ updateSkipped: true }));
    expect(output).toContain("offline");
  });

  it("includes store summary", () => {
    const output = renderInfoPlain(createInfoData());
    expect(output).toContain("12,847");
    expect(output).toContain("urn:pragma:standards");
  });

  it("shows default only when no named graphs", () => {
    const output = renderInfoPlain(
      createInfoData({ store: { tripleCount: 100, graphNames: [] } }),
    );
    expect(output).toContain("default");
    expect(output).not.toContain("urn:");
  });

  it("omits store section when store is undefined", () => {
    const output = renderInfoPlain(createInfoData({ store: undefined }));
    expect(output).not.toContain("Triples");
    expect(output).not.toContain("Graphs");
  });
});

describe("renderInfoLlm", () => {
  it("starts with markdown heading", () => {
    const output = renderInfoLlm(createInfoData());
    expect(output).toMatch(/^# pragma v0\.18\.0/);
  });

  it("includes tier chain", () => {
    const output = renderInfoLlm(createInfoData());
    expect(output).toContain("global → apps → apps/lxd");
  });

  it("includes update info", () => {
    const output = renderInfoLlm(
      createInfoData({
        update: {
          current: "0.18.0",
          latest: "0.19.0",
          command: "bun update -g @canonical/pragma",
        },
      }),
    );
    expect(output).toContain("0.18.0 → 0.19.0");
  });

  it("shows up to date", () => {
    const output = renderInfoLlm(createInfoData());
    expect(output).toContain("up to date");
  });

  it("shows offline", () => {
    const output = renderInfoLlm(createInfoData({ updateSkipped: true }));
    expect(output).toContain("offline");
  });

  it("includes store triple count", () => {
    const output = renderInfoLlm(createInfoData());
    expect(output).toContain("12,847 triples");
  });
});

describe("renderInfoJson", () => {
  it("produces valid JSON", () => {
    const data = createInfoData();
    const output = renderInfoJson(data);
    const parsed = JSON.parse(output);
    expect(parsed.version).toBe("0.18.0");
    expect(parsed.pm).toBe("bun");
  });

  it("includes all fields", () => {
    const data = createInfoData();
    const parsed = JSON.parse(renderInfoJson(data));
    expect(parsed).toHaveProperty("tier");
    expect(parsed).toHaveProperty("tierChain");
    expect(parsed).toHaveProperty("channel");
    expect(parsed).toHaveProperty("channelReleases");
    expect(parsed).toHaveProperty("store");
  });

  it("includes update when available", () => {
    const data = createInfoData({
      update: {
        current: "0.18.0",
        latest: "0.19.0",
        command: "bun update -g @canonical/pragma",
      },
    });
    const parsed = JSON.parse(renderInfoJson(data));
    expect(parsed.update.latest).toBe("0.19.0");
  });
});
