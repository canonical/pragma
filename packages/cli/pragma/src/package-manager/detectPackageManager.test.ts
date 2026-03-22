import { describe, expect, it } from "vitest";
import { PM_COMMANDS } from "./constants.js";
import detectPackageManager from "./detectPackageManager.js";

describe("detectPackageManager", () => {
  it("detects bun from bin path", () => {
    expect(
      detectPackageManager(
        "/home/user/.bun/install/global/node_modules/.bin/pragma",
      ),
    ).toBe("bun");
  });

  it("detects pnpm from bin path", () => {
    expect(
      detectPackageManager(
        "/home/user/.local/share/pnpm/global/5/node_modules/.bin/pragma",
      ),
    ).toBe("pnpm");
  });

  it("detects yarn from bin path", () => {
    expect(detectPackageManager("/home/user/.yarn/bin/pragma")).toBe("yarn");
  });

  it("detects yarn from global node_modules path", () => {
    expect(
      detectPackageManager(
        "/home/user/.config/yarn/global/node_modules/.bin/pragma",
      ),
    ).toBe("yarn");
  });

  it("defaults to npm for nvm paths", () => {
    expect(
      detectPackageManager(
        "/home/user/.config/nvm/versions/node/v24/bin/pragma",
      ),
    ).toBe("npm");
  });

  it("defaults to npm for unknown paths", () => {
    expect(detectPackageManager("/usr/local/bin/pragma")).toBe("npm");
  });

  it("defaults to npm when path cannot be resolved", () => {
    expect(detectPackageManager("/nonexistent/path/to/pragma")).toBe("npm");
  });
});

describe("PM_COMMANDS", () => {
  it("generates correct bun install command", () => {
    expect(PM_COMMANDS.bun.install("@canonical/pragma")).toBe(
      "bun add -g @canonical/pragma",
    );
  });

  it("generates correct npm update command", () => {
    expect(PM_COMMANDS.npm.update("@canonical/pragma")).toBe(
      "npm update -g @canonical/pragma",
    );
  });

  it("generates correct pnpm install command", () => {
    expect(PM_COMMANDS.pnpm.install("@canonical/pragma")).toBe(
      "pnpm add -g @canonical/pragma",
    );
  });

  it("generates correct yarn install command", () => {
    expect(PM_COMMANDS.yarn.install("@canonical/pragma")).toBe(
      "yarn global add @canonical/pragma",
    );
  });

  it("generates correct yarn update command", () => {
    expect(PM_COMMANDS.yarn.update("@canonical/pragma")).toBe(
      "yarn global upgrade @canonical/pragma",
    );
  });
});
