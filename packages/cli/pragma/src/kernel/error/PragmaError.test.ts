import { describe, expect, it } from "vitest";
import { errorEnvelope, successEnvelope } from "../render/envelope.js";
import { PragmaError } from "./PragmaError.js";
import { cliRecovery } from "./recovery.js";
import { serializeError } from "./serialize.js";

describe("PragmaError factories", () => {
  it("notFound carries entity, suggestions, and code", () => {
    const error = PragmaError.notFound("block", "Buton", {
      suggestions: ["Button"],
    });
    expect(error.code).toBe("ENTITY_NOT_FOUND");
    expect(error.entity).toEqual({ type: "block", name: "Buton" });
    expect(error.suggestions).toEqual(["Button"]);
    expect(error.message).toBe('block "Buton" not found.');
  });

  it("emptyResults defaults its message and keeps filters", () => {
    const error = PragmaError.emptyResults("token", {
      filters: { channel: "stable" },
    });
    expect(error.code).toBe("EMPTY_RESULTS");
    expect(error.message).toBe("No tokens found.");
    expect(error.filters).toEqual({ channel: "stable" });
  });

  it("invalidInput enumerates valid options", () => {
    const error = PragmaError.invalidInput("format", "yaml", {
      validOptions: ["plain", "llm", "json"],
    });
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.validOptions).toEqual(["plain", "llm", "json"]);
  });

  it("unknownVerb names the token", () => {
    const error = PragmaError.unknownVerb("frobnicate");
    expect(error.code).toBe("UNKNOWN_VERB");
    expect(error.message).toBe('Unknown command "frobnicate".');
  });

  it("storeUnavailable takes its own class", () => {
    const error = PragmaError.storeUnavailable("connection refused");
    expect(error.code).toBe("STORE_UNAVAILABLE");
    expect(error.message).toContain("connection refused");
  });

  it("configError passes the reason through verbatim", () => {
    const error = PragmaError.configError("bad channel", {
      validOptions: ["normal"],
    });
    expect(error.code).toBe("CONFIG_ERROR");
    expect(error.message).toBe("bad channel");
    expect(error.validOptions).toEqual(["normal"]);
  });

  it("internalError attaches a report hint", () => {
    const error = PragmaError.internalError("boom");
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.recovery).toEqual({ message: "Please report this issue." });
  });
});

describe("serializeError", () => {
  it("omits empty and absent optional fields", () => {
    const error = PragmaError.internalError("boom");
    expect(serializeError(error)).toEqual({
      code: "INTERNAL_ERROR",
      message: "Internal error: boom",
      recovery: { message: "Please report this issue." },
    });
  });

  it("includes suggestions, recovery, validOptions, and filters when present", () => {
    const error = PragmaError.notFound("block", "Buton", {
      suggestions: ["Button"],
      recovery: cliRecovery("pragma block list", "List blocks."),
    });
    expect(serializeError(error)).toEqual({
      code: "ENTITY_NOT_FOUND",
      message: 'block "Buton" not found.',
      suggestions: ["Button"],
      recovery: { cli: "pragma block list", message: "List blocks." },
    });
  });
});

describe("envelope builders", () => {
  it("wraps success data with default empty meta", () => {
    expect(successEnvelope({ made: true })).toEqual({
      ok: true,
      data: { made: true },
      meta: {},
    });
  });

  it("carries plan-first meta through", () => {
    expect(
      successEnvelope({ plan: [] }, { planOnly: true, confirmRequired: true }),
    ).toEqual({
      ok: true,
      data: { plan: [] },
      meta: { planOnly: true, confirmRequired: true },
    });
  });

  it("wraps an error into the failure envelope", () => {
    const error = PragmaError.invalidInput("format", "yaml", {
      validOptions: ["plain", "llm", "json"],
    });
    expect(errorEnvelope(error)).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: 'Invalid format "yaml".',
        validOptions: ["plain", "llm", "json"],
      },
    });
  });
});
