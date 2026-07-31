import { describe, expect, it } from "vitest";
import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import { cliRecovery } from "./recovery.js";

describe("recovery.cli invariant (D5)", () => {
  it("carries the shipped distribution's recovery prefix", () => {
    // The prefix is DERIVED from the distribution's `name` (pragma.conf.ts), so
    // recovery hints quote a command the installed binary actually answers to.
    // This pins the value THIS distribution ships; `src/identity.test.ts` proves
    // the derivation by varying the config.
    expect(RECOVERY_CLI_PREFIX).toBe("pragma ");
  });

  it("prepends the distribution's prefix to the command it is given", () => {
    // The caller passes the SUFFIX, so a hint naming the wrong binary is
    // unwritable rather than merely asserted against. What replaced the deleted
    // `assertRecoveryCli` is `kernel/copy.test.ts`'s position rule, which sees
    // the raw `cli:` literals that never reached this function at all — the only
    // place a wrong prefix was ever actually written.
    expect(cliRecovery("config show", "See the resolved config.")).toEqual({
      cli: "pragma config show",
      message: "See the resolved config.",
    });
  });

  it("carries an MCP tool alongside the command when one is given", () => {
    expect(
      cliRecovery("sources update", "Build the store.", {
        tool: "sources_update",
      }),
    ).toEqual({
      cli: "pragma sources update",
      message: "Build the store.",
      mcp: { tool: "sources_update" },
    });
  });
});
