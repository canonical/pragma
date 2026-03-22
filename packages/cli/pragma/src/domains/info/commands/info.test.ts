import { describe, expect, it } from "vitest";
import infoCommand from "./info.js";

describe("infoCommand", () => {
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
});
