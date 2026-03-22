import { describe, expect, it } from "vitest";
import { PragmaError } from "../error/PragmaError.js";
import serializeErrorPayload from "./serializeErrorPayload.js";

describe("serializeErrorPayload", () => {
  it("includes code and message", () => {
    const error = PragmaError.emptyResults("component");
    const payload = serializeErrorPayload(error);

    expect(payload.code).toBe("EMPTY_RESULTS");
    expect(payload.message).toContain("component");
  });

  it("includes filters when present", () => {
    const error = PragmaError.emptyResults("component", {
      filters: { tier: "global" },
    });
    const payload = serializeErrorPayload(error);

    expect(payload.filters).toEqual({ tier: "global" });
  });

  it("includes validOptions when present", () => {
    const error = PragmaError.invalidInput("channel", "beta", {
      validOptions: ["normal", "experimental"],
    });
    const payload = serializeErrorPayload(error);

    expect(payload.validOptions).toEqual(["normal", "experimental"]);
  });

  it("omits empty suggestions", () => {
    const error = PragmaError.storeError("fail");
    const payload = serializeErrorPayload(error);

    expect(payload).not.toHaveProperty("suggestions");
  });
});
