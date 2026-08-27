/**
 * `pragma colophon` — the storeless, pack-extensible toolchain colophon (PR10).
 *
 * Pins the covenant-exact emitted slice (`{ v:"colophon", mcp:"colophon" }`),
 * proves the collector is storeless and prints the ACTIVE DOMAIN's colophon
 * (the bundled `block` design-system story) with no toolchain section in front
 * of it, pins the empty state for a distribution and packs that declare none,
 * exercises the three formatter modes + `--format` precedence, holds CLI-json
 * ≡ MCP parity, and checks the pack-grammar accepts a `colophon` field
 * (rejecting a non-string). The fallback — the toolchain's own section when no
 * pack tells a story — is pinned where a story-less distribution exists:
 * `identity.test.ts`'s fork.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { parsePackDefinition } from "../../kernel/packs/schema.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { emitSurface, emitVerb } from "../../kernel/spec/emitSurface.js";
import {
  assertConforms,
  type Covenant,
} from "../../kernel/spec/surfaceConformance.js";
import type { GlobalFlags, VerbSpec } from "../../kernel/spec/types.js";
import { projectMcp } from "../../testing/helpers/projectMcp.js";
import { collectColophon } from "./collectColophon.js";
import { colophonFormatters } from "./colophon.render.js";
import { colophonModule } from "./index.js";
import type { ColophonData } from "./types.js";

/** The committed covenant, read from disk exactly as a consumer would. */
const golden = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../surface/surface.v2.json", import.meta.url)),
    "utf-8",
  ),
) as Covenant;

const colophonVerb = colophonModule.verbs[0] as VerbSpec;

const FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "plain",
  verbose: false,
};
const FLAGS_JSON: GlobalFlags = { ...FLAGS, format: "json" };
const FLAGS_LLM: GlobalFlags = { ...FLAGS, format: "llm", llm: true };
const NO_MUT = { dryRun: false, undo: false, yes: false };

/** A deterministic two-section fixture for pure formatter assertions. */
const FIXTURE: ColophonData = {
  sections: [
    {
      kind: "pragma",
      title: "pragma",
      markdown: "Intro **bold** line.\n\n## Section\n- one\n- two",
      summary: "condensed pragma story",
      source: "built-in",
    },
    {
      kind: "pack",
      title: "block",
      markdown: "The domain body, no summary.",
      source: "pack:block",
    },
  ],
};

const roots: string[] = [];
let prevXdg: string | undefined;
const tmpCwd = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "pragma-colophon-"));
  roots.push(dir);
  return dir;
};

beforeEach(() => {
  // Isolate the global config layer so the collector reads defaults (no stories)
  // and the run is hermetic.
  prevXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmpCwd();
});
afterEach(() => {
  process.env.XDG_CONFIG_HOME = prevXdg;
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

describe("colophon — covenant-exact emission (PROTECTED)", () => {
  it("emits the self-verb slice { v: colophon, mcp: colophon }", () => {
    expect(emitVerb(colophonVerb)).toEqual({ v: "colophon", mcp: "colophon" });
  });

  it("the emitted colophon slice conforms to the frozen covenant", () => {
    expect(() =>
      assertConforms(emitSurface([colophonModule]), golden),
    ).not.toThrow();
  });
});

describe("colophon — storeless collector (PROTECTED)", () => {
  it("collectColophon never boots the store", async () => {
    const rt = bootRuntime(FLAGS, tmpCwd());
    await collectColophon(rt);
    expect(rt.store.booted).toBe(false);
  });

  it("the verb runs without booting the store", async () => {
    const rt = bootRuntime(FLAGS, tmpCwd());
    const outcome = await executeVerb(colophonVerb, {}, NO_MUT, rt);
    expect(outcome.exitCode).toBe(0);
    expect(rt.store.booted).toBe(false);
  });
});

describe("colophon — the configured domain's story, and only that", () => {
  it("prints the bundled design-system (block) domain section", async () => {
    const data = await collectColophon(bootRuntime(FLAGS, tmpCwd()));
    const block = data.sections.find((section) => section.title === "block");
    expect(block?.kind).toBe("pack");
    expect(block?.source).toBe("pack:block");
    expect(block?.markdown).toContain("knowledge graph");
  });

  it("does NOT prepend the toolchain's own section when a domain has one", async () => {
    // A configured reader asked about the domain. The paragraph about how this
    // program is built is not an answer to that, and it used to arrive first.
    const data = await collectColophon(bootRuntime(FLAGS, tmpCwd()));
    // Guard the vacuous pass: `every` over nothing is true, and "no sections"
    // is a different outcome than "only domain sections".
    expect(data.sections.length).toBeGreaterThan(0);
    expect(data.sections.every((section) => section.kind === "pack")).toBe(
      true,
    );
  });

  it("says so, on stderr, when nothing declares a colophon", () => {
    // The collector can only reach this with neither a pack story nor a
    // distribution one; the formatter is where the state is expressible, so
    // the empty state is pinned here — bare stdout, guidance on stderr.
    const empty: ColophonData = { sections: [] };
    expect(colophonFormatters.plain(empty)).toBe("");
    const notice = colophonFormatters.emptyNotice?.(empty);
    expect(notice).toContain("No colophon declared");
    expect(notice).toContain("sources update");
    // llm returns before the dispatcher's stderr routing, so it says the same
    // thing in its own body rather than emitting nothing.
    expect(colophonFormatters.llm(empty)).toContain("No colophon declared");
    // A populated payload has nothing to be calm about.
    expect(colophonFormatters.emptyNotice?.(FIXTURE)).toBeUndefined();
  });
});

describe("colophon — formatter modes", () => {
  it("plain styles headings/bullets and titles every section", () => {
    const out = colophonFormatters.plain(FIXTURE);
    expect(out).toContain("pragma");
    expect(out).toContain("block");
    expect(out).toContain("•"); // the `-` bullet transform
    expect(out).not.toContain("**bold**"); // inline markers are consumed
  });

  it("llm prefers the summary, else the markdown body", () => {
    const out = colophonFormatters.llm(FIXTURE);
    expect(out).toContain("## pragma");
    expect(out).toContain("condensed pragma story"); // summary used
    expect(out).not.toContain("Intro **bold** line"); // full body NOT used
    expect(out).toContain("## block");
    expect(out).toContain("The domain body, no summary."); // markdown used
  });

  it("json round-trips the ColophonData", () => {
    expect(JSON.parse(colophonFormatters.json(FIXTURE))).toEqual(FIXTURE);
  });

  it("--format json wins: executeVerb returns the {ok,data} envelope", async () => {
    const outcome = await executeVerb(
      colophonVerb,
      {},
      NO_MUT,
      bootRuntime(FLAGS_JSON, tmpCwd()),
    );
    const envelope = JSON.parse(outcome.stdout as string);
    expect(envelope.ok).toBe(true);
    expect((envelope.data as ColophonData).sections[0]?.kind).toBe("pack");
  });

  it("--format llm selects the condensed Markdown form", async () => {
    const outcome = await executeVerb(
      colophonVerb,
      {},
      NO_MUT,
      bootRuntime(FLAGS_LLM, tmpCwd()),
    );
    expect(outcome.stdout).toContain("## block");
  });
});

describe("colophon — MCP parity", () => {
  it("projects a read-only `colophon` tool that returns the domain section", async () => {
    const cwd = tmpCwd();
    const mcp = await projectMcp([colophonModule], cwd);
    const tool = (await mcp.listTools()).find((t) => t.name === "colophon");
    const envelope = await mcp.callTool("colophon");
    await mcp.cleanup();

    expect(tool).toBeDefined();
    expect(tool?.annotations).toMatchObject({
      readOnlyHint: true,
      openWorldHint: false,
    });
    expect(envelope.ok).toBe(true);
    expect((envelope.data as ColophonData).sections[0]?.kind).toBe("pack");
  });

  it("CLI --format json ≡ MCP colophon (same envelope)", async () => {
    const cwd = tmpCwd();
    const cli = await executeVerb(
      colophonVerb,
      {},
      NO_MUT,
      bootRuntime(FLAGS_JSON, cwd),
    );
    const cliEnvelope = JSON.parse(cli.stdout as string);

    const mcp = await projectMcp([colophonModule], cwd);
    const mcpEnvelope = await mcp.callTool("colophon");
    await mcp.cleanup();

    expect(cliEnvelope).toEqual(mcpEnvelope);
    expect(cliEnvelope.ok).toBe(true);
  });
});

describe("colophon — pack-grammar `colophon` field", () => {
  it("parsePackDefinition accepts a string colophon", () => {
    const def = parsePackDefinition(
      {
        noun: "demo",
        lookup: { by: "ds:name" },
        colophon: "How the demo domain is made.",
      },
      "config",
    );
    expect(def.colophon).toBe("How the demo domain is made.");
  });

  it("rejects a non-string colophon (the schema is strict)", () => {
    expect(() =>
      parsePackDefinition(
        { noun: "demo", lookup: { by: "ds:name" }, colophon: 123 },
        "config",
      ),
    ).toThrow(PragmaError);
  });
});
