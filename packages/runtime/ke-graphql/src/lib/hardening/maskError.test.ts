import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";
import maskError from "./maskError.js";

describe("maskError (production error masking)", () => {
  it("masks an internal error (wrapping a non-GraphQL throw) when enabled", () => {
    const internal = new GraphQLError("connection refused: db://secret@host", {
      originalError: new Error("connection refused: db://secret@host"),
    });
    const formatted = maskError(internal, true);
    expect(formatted.message).toBe("Internal server error");
    expect(formatted.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("passes the original message through when masking is disabled", () => {
    const internal = new GraphQLError("boom", {
      originalError: new Error("boom"),
    });
    expect(maskError(internal, false).message).toBe("boom");
  });

  it("never masks a deliberate client-facing GraphQLError", () => {
    // Validation-style error: no originalError.
    expect(
      maskError(new GraphQLError("Cannot query field x"), true).message,
    ).toBe("Cannot query field x");
    // An error that wraps another GraphQLError is still client-facing.
    const wrapping = new GraphQLError("Argument first must be non-negative", {
      originalError: new GraphQLError("Argument first must be non-negative"),
    });
    expect(maskError(wrapping, true).message).toBe(
      "Argument first must be non-negative",
    );
  });
});
