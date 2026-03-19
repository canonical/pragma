import { describe, expect, it } from "vitest";
import upgradeCommand from "./upgradeCommand.js";

describe("upgradeCommand", () => {
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
});
