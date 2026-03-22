import { describe, expect, it } from "vitest";
import { PragmaError } from "../error/index.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "./renderError.js";

describe("renderErrorPlain", () => {
  it("renders a basic error", () => {
    const err = PragmaError.internalError("something broke");
    const out = renderErrorPlain(err);
    expect(out).toContain("Error: Internal error: something broke");
    expect(out).toContain("Please report this issue.");
  });

  it("renders suggestions", () => {
    const err = PragmaError.notFound("component", "Buton", {
      suggestions: ["Button", "ButtonGroup"],
    });
    const out = renderErrorPlain(err);
    expect(out).toContain("Did you mean?");
    expect(out).toContain("  - Button");
    expect(out).toContain("  - ButtonGroup");
  });

  it("renders filters", () => {
    const err = PragmaError.emptyResults("component", {
      filters: { tier: "apps/lxd", channel: "normal" },
    });
    const out = renderErrorPlain(err);
    expect(out).toContain("Active filters:");
    expect(out).toContain("  tier: apps/lxd");
    expect(out).toContain("  channel: normal");
  });

  it("renders validOptions", () => {
    const err = PragmaError.invalidInput("channel", "aggressive", {
      validOptions: ["normal", "experimental", "prerelease"],
    });
    const out = renderErrorPlain(err);
    expect(out).toContain("Valid options: normal, experimental, prerelease");
  });

  it("renders recovery with cli command", () => {
    const err = PragmaError.notFound("component", "Foo", {
      recovery: {
        message: "List available components.",
        cli: "pragma block list",
        mcp: { tool: "block_list" },
      },
    });
    const out = renderErrorPlain(err);
    expect(out).toContain("Run `pragma block list`");
  });

  it("renders recovery with message only (no cli)", () => {
    const err = PragmaError.emptyResults("component", {
      recovery: {
        message: "Ensure design system packages are installed.",
      },
    });
    const out = renderErrorPlain(err);
    expect(out).toContain("Ensure design system packages are installed.");
  });
});

describe("renderErrorLlm", () => {
  it("renders structured markdown", () => {
    const err = PragmaError.notFound("component", "Buton", {
      suggestions: ["Button", "ButtonGroup"],
      recovery: {
        message: "List available components.",
        cli: "pragma block list",
        mcp: { tool: "block_list" },
      },
    });
    const out = renderErrorLlm(err);
    expect(out).toContain("## Error: ENTITY_NOT_FOUND");
    expect(out).toContain('component "Buton" not found.');
    expect(out).toContain("Suggestions: Button, ButtonGroup");
    expect(out).toContain("Recovery: `pragma block list`");
  });

  it("renders filters", () => {
    const err = PragmaError.emptyResults("component", {
      filters: { tier: "apps/lxd" },
    });
    const out = renderErrorLlm(err);
    expect(out).toContain("Filters: tier=apps/lxd");
  });

  it("renders validOptions", () => {
    const err = PragmaError.invalidInput("channel", "bad", {
      validOptions: ["normal", "experimental"],
    });
    const out = renderErrorLlm(err);
    expect(out).toContain("Valid options: normal, experimental");
  });

  it("renders recovery message when no cli", () => {
    const err = PragmaError.emptyResults("component", {
      recovery: {
        message: "Install packages first.",
      },
    });
    const out = renderErrorLlm(err);
    expect(out).toContain("Recovery: Install packages first.");
  });
});

describe("renderErrorJson", () => {
  it("produces valid JSON with all fields", () => {
    const err = PragmaError.notFound("component", "Buton", {
      suggestions: ["Button"],
      recovery: {
        message: "List available components.",
        cli: "pragma block list",
        mcp: { tool: "block_list" },
      },
    });
    const parsed = JSON.parse(renderErrorJson(err));
    expect(parsed.code).toBe("ENTITY_NOT_FOUND");
    expect(parsed.message).toBe('component "Buton" not found.');
    expect(parsed.entity).toEqual({ type: "component", name: "Buton" });
    expect(parsed.suggestions).toEqual(["Button"]);
    expect(parsed.recovery).toEqual({
      message: "List available components.",
      cli: "pragma block list",
      mcp: { tool: "block_list" },
    });
  });

  it("includes filters and validOptions", () => {
    const err = PragmaError.emptyResults("component", {
      filters: { tier: "global" },
    });
    const parsed = JSON.parse(renderErrorJson(err));
    expect(parsed.code).toBe("EMPTY_RESULTS");
    expect(parsed.filters).toEqual({ tier: "global" });
  });

  it("includes undefined fields as undefined/null", () => {
    const err = PragmaError.storeError("disk full");
    const parsed = JSON.parse(renderErrorJson(err));
    expect(parsed.code).toBe("STORE_ERROR");
    expect(parsed.entity).toBeUndefined();
    expect(parsed.filters).toBeUndefined();
    expect(parsed.validOptions).toBeUndefined();
  });
});
