import { describe, expect, it } from "vitest";
import StatusResponse from "./StatusResponse.js";

describe("StatusResponse", () => {
  it("constructs a typed status response", () => {
    const statusResponse = new StatusResponse(503, {
      message: "Back soon",
      eta: "5m",
    });

    expect(statusResponse.status).toBe(503);
    expect(statusResponse.data).toEqual({ message: "Back soon", eta: "5m" });
  });
});
