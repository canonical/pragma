import { describe, expect, it } from "vitest";
import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import { PragmaError } from "./PragmaError.js";
import { assertRecoveryCli, cliRecovery } from "./recovery.js";

describe("recovery.cli invariant (D5)", () => {
  it("keeps the recovery prefix literal as `pragma `", () => {
    // Recovery hints quote the stable, documented command name via the fixed
    // `pragma ` prefix, so they never drift from the published command.
    expect(RECOVERY_CLI_PREFIX).toBe("pragma ");
  });

  it("accepts a command carrying the canonical prefix", () => {
    expect(() => assertRecoveryCli("pragma info")).not.toThrow();
    expect(() => assertRecoveryCli("pragma config show")).not.toThrow();
  });

  it("rejects a command missing the prefix", () => {
    expect(() => assertRecoveryCli("info")).toThrow(/must start with/);
    expect(() => assertRecoveryCli("pragmatic info")).toThrow(
      /must start with/,
    );
    expect(() => assertRecoveryCli("pragmainfo")).toThrow(/must start with/);
  });

  it("builds a validated recovery whose cli carries the prefix", () => {
    const recovery = cliRecovery(
      "pragma config show",
      "See the resolved config.",
    );
    expect(recovery).toEqual({
      cli: "pragma config show",
      message: "See the resolved config.",
    });
    expect(recovery.cli?.startsWith(RECOVERY_CLI_PREFIX)).toBe(true);
  });

  it("refuses to build a recovery from an unprefixed command", () => {
    expect(() => cliRecovery("config show", "nope")).toThrow(/must start with/);
  });

  it("every PragmaError.recovery.cli in the kernel carries the prefix", () => {
    // The factories that ship a recovery hint must honour the invariant. Only
    // internalError seeds one today (message-only, no cli), so assert the
    // guard holds for any cli that is present.
    const errors = [
      PragmaError.internalError("boom"),
      PragmaError.notFound("block", "Nope", {
        recovery: cliRecovery("pragma block list", "List blocks."),
      }),
    ];
    for (const error of errors) {
      if (error.recovery?.cli) {
        expect(() =>
          assertRecoveryCli(error.recovery.cli as string),
        ).not.toThrow();
      }
    }
  });
});
