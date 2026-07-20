/**
 * A8 — the error/recovery MATRIX (shape), storeless half.
 *
 * `renderError{Plain,Llm,Json}` (`kernel/error/renderError.ts`) had NO dedicated
 * test before this file (confirmed — only the `PragmaError` factories and the
 * `recovery.cli` D5 invariant are unit-tested; the render layer's SECTION
 * handling — "Did you mean?" / "Active filters:" / "Valid options:" /
 * "Run `…`" / "Recovery: `…`" — was untested). This sweeps a representative
 * MATRIX of error shapes (suggestions, filters, validOptions, a CLI recovery,
 * an MCP-only recovery) across plain/llm/json, then grounds it with one REAL
 * spawn (`skill lookup <unknown>`) so the matrix isn't purely synthetic.
 *
 * The `error.filters` shape has no LIVE trigger among PR3's read nouns yet (see
 * PARITY_GAPS `no-empty-hook-on-free-filter`) — swept here with a directly
 * constructed error so the render layer's handling of it is proven regardless.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import {
  renderErrorJson,
  renderErrorLlm,
  renderErrorPlain,
} from "../../kernel/error/renderError.js";
import { freshXdgEnv, runCli } from "../helpers/runCli.js";

const MATRIX: readonly {
  readonly label: string;
  readonly error: PragmaError;
}[] = [
  {
    label: "suggestions",
    error: PragmaError.notFound("block", "Buton", {
      suggestions: ["Button"],
    }),
  },
  {
    label: "filters",
    error: PragmaError.emptyResults("standard", {
      filters: { category: "nonexistent" },
    }),
  },
  {
    label: "validOptions",
    error: PragmaError.invalidInput("format", "yaml", {
      // The live `--format` set (mirrors bin.ts): plain, llm, json.
      validOptions: ["plain", "llm", "json"],
    }),
  },
  {
    label: "recovery.cli",
    error: PragmaError.notFound("skill", "docs", {
      recovery: {
        message: "List discovered skills.",
        cli: "pragma skill list",
      },
    }),
  },
  {
    label: "recovery (mcp-only, no cli)",
    error: PragmaError.storeUnavailable("no lock", {
      recovery: { message: "Please report this issue." },
    }),
  },
];

describe("error/recovery matrix — render shapes (A8, storeless)", () => {
  it.each(MATRIX)("plain renders the $label section", ({ error }) => {
    const text = renderErrorPlain(error);
    expect(text).toContain(`Error: ${error.message}`);
    if (error.suggestions.length > 0) expect(text).toContain("Did you mean?");
    if (error.filters) expect(text).toContain("Active filters:");
    if (error.validOptions) expect(text).toContain("Valid options:");
    if (error.recovery) {
      // The human guidance is ALWAYS shown — even when a runnable `cli` is
      // present (it used to be dropped, losing the WHY).
      expect(text).toContain(error.recovery.message);
      if (error.recovery.cli)
        expect(text).toContain(`Run \`${error.recovery.cli}\``);
    }
  });

  it.each(MATRIX)("llm renders the $label section", ({ error }) => {
    const text = renderErrorLlm(error);
    expect(text).toContain(`## Error: ${error.code}`);
    if (error.suggestions.length > 0) expect(text).toContain("Suggestions:");
    if (error.filters) expect(text).toContain("Filters:");
    if (error.validOptions) expect(text).toContain("Valid options:");
    if (error.recovery) {
      expect(text).toContain(`Recovery: ${error.recovery.message}`);
      if (error.recovery.cli)
        expect(text).toContain(`\`${error.recovery.cli}\``);
    }
  });

  it.each(MATRIX)("json renders the failure envelope for $label", ({
    error,
  }) => {
    const envelope = JSON.parse(renderErrorJson(error)) as {
      ok: boolean;
      error: { code: string };
    };
    expect(envelope.ok).toBe(false);
    expect(envelope.error.code).toBe(error.code);
  });
});

describe("error/recovery matrix — grounded in a real spawn (A8, e2e)", () => {
  it("skill lookup <unknown> renders suggestions + recovery on stderr", () => {
    const cwd = mkdtempSync(join(tmpdir(), "pragma-errmatrix-skill-"));
    const result = runCli(["skill", "lookup", "docz"], {
      cwd,
      // Force plain (not the piped-stdout auto-llm default) — this test grounds
      // the PLAIN render shape; llm/json are already covered above.
      env: { ...freshXdgEnv(), XDG_DATA_HOME: cwd, PRAGMA_NO_AUTO_LLM: "1" },
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Error:");
    expect(result.stderr).toContain("Run `pragma skill list`");
  });
});
