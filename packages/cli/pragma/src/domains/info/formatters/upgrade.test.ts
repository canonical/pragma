import { describe, expect, it } from "vitest";
import type { UpgradeData } from "../types.js";
import {
  renderUpgradeJson,
  renderUpgradeLlm,
  renderUpgradePlain,
} from "./upgrade.js";

function createUpgradeData(overrides: Partial<UpgradeData> = {}): UpgradeData {
  return {
    pm: "bun",
    current: "0.18.0",
    latest: "0.19.0",
    command: "bun update -g @canonical/pragma-cli",
    dryRun: false,
    alreadyLatest: false,
    offline: false,
    executed: true,
    ...overrides,
  };
}

describe("renderUpgradePlain", () => {
  it("shows PM info", () => {
    const output = renderUpgradePlain(createUpgradeData());
    expect(output).toContain("bun (global)");
  });

  it("shows version transition", () => {
    const output = renderUpgradePlain(createUpgradeData());
    expect(output).toContain("0.18.0");
    expect(output).toContain("0.19.0");
  });

  it("shows executed message", () => {
    const output = renderUpgradePlain(createUpgradeData());
    expect(output).toContain("done. Updated to 0.19.0");
  });

  it("shows dry-run message", () => {
    const output = renderUpgradePlain(createUpgradeData({ dryRun: true }));
    expect(output).toContain("Would run");
    expect(output).not.toContain("done.");
  });

  it("shows already latest", () => {
    const output = renderUpgradePlain(
      createUpgradeData({ alreadyLatest: true }),
    );
    expect(output).toContain("Already at latest version");
  });

  it("shows offline message", () => {
    const output = renderUpgradePlain(
      createUpgradeData({ offline: true, latest: undefined }),
    );
    expect(output).toContain("Could not reach registry");
  });

  it("uses npm command for npm PM", () => {
    const output = renderUpgradePlain(
      createUpgradeData({
        pm: "npm",
        command: "npm update -g @canonical/pragma-cli",
      }),
    );
    expect(output).toContain("npm update -g @canonical/pragma-cli");
  });

  it("uses yarn command for yarn PM", () => {
    const output = renderUpgradePlain(
      createUpgradeData({
        pm: "yarn",
        command: "yarn global upgrade @canonical/pragma-cli",
      }),
    );
    expect(output).toContain("yarn global upgrade @canonical/pragma-cli");
  });
});

describe("renderUpgradeLlm", () => {
  it("shows upgrade transition", () => {
    const output = renderUpgradeLlm(createUpgradeData());
    expect(output).toContain("0.18.0 → 0.19.0");
  });

  it("shows dry-run info", () => {
    const output = renderUpgradeLlm(createUpgradeData({ dryRun: true }));
    expect(output).toContain("Would upgrade");
    expect(output).toContain("Command:");
  });

  it("shows already latest", () => {
    const output = renderUpgradeLlm(createUpgradeData({ alreadyLatest: true }));
    expect(output).toContain("Already at latest");
  });

  it("shows offline", () => {
    const output = renderUpgradeLlm(
      createUpgradeData({ offline: true, latest: undefined }),
    );
    expect(output).toContain("could not reach registry");
  });
});

describe("renderUpgradeJson", () => {
  it("produces valid JSON", () => {
    const data = createUpgradeData();
    const parsed = JSON.parse(renderUpgradeJson(data));
    expect(parsed.pm).toBe("bun");
    expect(parsed.current).toBe("0.18.0");
    expect(parsed.latest).toBe("0.19.0");
  });

  it("includes all fields", () => {
    const parsed = JSON.parse(renderUpgradeJson(createUpgradeData()));
    expect(parsed).toHaveProperty("dryRun");
    expect(parsed).toHaveProperty("alreadyLatest");
    expect(parsed).toHaveProperty("offline");
    expect(parsed).toHaveProperty("executed");
    expect(parsed).toHaveProperty("command");
  });

  it("handles offline case", () => {
    const parsed = JSON.parse(
      renderUpgradeJson(
        createUpgradeData({ offline: true, latest: undefined }),
      ),
    );
    expect(parsed.offline).toBe(true);
    expect(parsed.latest).toBeUndefined();
  });
});
