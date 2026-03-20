import { describe, expect, it } from "vitest";
import doctorCommand from "./doctor.js";

describe("doctorCommand", () => {
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
});
