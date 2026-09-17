import { describe, expect, it } from "vitest";
import { RECOVERY_CLI_PREFIX } from "../../constants.js";
import { callRecovery } from "./recovery.js";

describe("recovery.cli invariant (D5)", () => {
  it("carries the shipped distribution's recovery prefix", () => {
    // The prefix is DERIVED from the distribution's `name` (pragma.conf.ts), so
    // recovery hints quote a command the installed binary actually answers to.
    // This pins the value THIS distribution ships; `src/identity.test.ts` proves
    // the derivation by varying the config.
    expect(RECOVERY_CLI_PREFIX).toBe("pragma ");
  });

  it("derives both spellings from the one call it is given", () => {
    // The caller names a CALL, so a hint naming the wrong binary — or a CLI
    // string and an MCP hint that disagree about an argument — is unwritable
    // rather than merely asserted against. `kernel/copy.test.ts`'s position
    // rule still sees the raw `cli:` literals that never reach this function.
    expect(
      callRecovery(
        { verb: "config unset", params: { key: "tier" } },
        "Clear the field.",
      ),
    ).toEqual({
      cli: "pragma config unset tier",
      message: "Clear the field.",
      mcp: { tool: "config_unset", params: { key: "tier" } },
    });
  });

  it("spells a flag, quotes what a shell would split, and repeats a variadic positional", () => {
    expect(
      callRecovery(
        { verb: "token consumers", params: { symbol: "color.text" } },
        "m",
      ).cli,
    ).toBe("pragma token consumers --symbol color.text");
    expect(
      callRecovery(
        { verb: "graph query", params: { sparql: "ASK { ?s ?p 'x' }" } },
        "m",
      ).cli,
    ).toBe("pragma graph query 'ASK { ?s ?p '\\''x'\\'' }'");
    expect(
      callRecovery(
        { verb: "block lookup", params: { name: ["Button", "Card"] } },
        "m",
      ).cli,
    ).toBe("pragma block lookup Button Card");
    expect(
      callRecovery(
        { verb: "sources update", params: { skipInvalid: true } },
        "m",
      ).cli,
    ).toBe("pragma sources update --skip-invalid");
    expect(
      callRecovery(
        { verb: "sources update", params: { skipInvalid: false } },
        "m",
      ).cli,
    ).toBe("pragma sources update");
  });

  it("names no MCP tool for a verb withheld from MCP", () => {
    expect(callRecovery({ verb: "version" }, "See the version.")).toEqual({
      cli: "pragma version",
      message: "See the version.",
    });
  });
});
