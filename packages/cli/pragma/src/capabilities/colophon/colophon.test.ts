/**
 * `pragma colophon` — the storeless, pack-extensible toolchain colophon (PR10).
 *
 * Pins the covenant-exact emitted slice (`{ v:"colophon", mcp:"colophon" }`),
 * proves the collector is storeless and combines the DISTRIBUTION's declared
 * section with the active pack's (the bundled `block` design-system colophon),
 * holds the verb's own prose clear of that declaration, exercises the
 * three formatter modes + `--format` precedence, holds CLI-json ≡ MCP
 * parity, and checks the pack-grammar accepts a `colophon` field (rejecting a
 * non-string).
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BIN_NAME } from "../../constants.js";
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
    fileURLToPath(new URL("../../../surface/covenant.json", import.meta.url)),
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
      // Titled from `BIN_NAME`, not re-typed: the leading section IS the
      // distribution's own, so under a fork these assertions still hold.
      kind: "distribution",
      title: BIN_NAME,
      markdown: "Intro **bold** line.\n\n## Section\n- one\n- two",
      summary: "condensed distribution story",
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

describe("colophon — combined content (pragma + active domain)", () => {
  it("leads with the distribution's declared section", async () => {
    const data = await collectColophon(bootRuntime(FLAGS, tmpCwd()));
    const first = data.sections[0];
    expect(first?.kind).toBe("distribution");
    expect(first?.title).toBe(BIN_NAME);
    expect(first?.source).toBe("built-in");
    expect(first?.markdown.length).toBeGreaterThan(0);
    expect(first?.summary?.length).toBeGreaterThan(0);
  });

  it("appends the bundled design-system (block) domain section", async () => {
    const data = await collectColophon(bootRuntime(FLAGS, tmpCwd()));
    const block = data.sections.find((section) => section.title === "block");
    expect(block?.kind).toBe("pack");
    expect(block?.source).toBe("pack:block");
    expect(block?.markdown).toContain("knowledge graph");
  });

  it("the verb's own prose quotes none of the declared colophon's chapters", async () => {
    // The one surface the fork probe structurally cannot see. `identity.test.ts`
    // scans the generated reference for THIS distribution's NAME, and the verb's
    // `doc` composes `${BIN_NAME}` and names no distribution — so a doc that
    // summarises this distribution's colophon reads as clean under a fork's name
    // while publishing a description of a story the fork does not have. It is
    // published four times over (`--help`, the MCP tool description,
    // `commands.md`, `tools.md`).
    //
    // Derived from the DECLARATION, not from a literal chapter list: the
    // declaration is the authoring point, so a chapter renamed there and
    // re-quoted here fails. What it catches is a QUOTE — the pre-fix doc opened
    // its parenthetical with "the effect monad", the declaration's first
    // heading, and this fails on it. A paraphrase of a chapter would still slip
    // through; that is why the docblock beside `doc` states the rule too.
    const { sections } = await collectColophon(bootRuntime(FLAGS, tmpCwd()));
    const declared = sections.find((s) => s.kind === "distribution");
    const headings = [...(declared?.markdown ?? "").matchAll(/^##\s+(.+)$/gm)]
      .map((match) => match[1]?.trim() ?? "")
      .filter((heading) => heading.length > 0);
    expect(headings.length).toBeGreaterThan(0);
    const doc = colophonModule.verbs[0]?.doc?.toLowerCase() ?? "";
    expect(doc.length).toBeGreaterThan(0);
    expect(
      headings.filter((heading) => doc.includes(heading.toLowerCase())),
    ).toEqual([]);
  });
});

describe("colophon — formatter modes", () => {
  it("plain styles headings/bullets and titles every section", () => {
    const out = colophonFormatters.plain(FIXTURE);
    expect(out).toContain(BIN_NAME);
    expect(out).toContain("block");
    expect(out).toContain("•"); // the `-` bullet transform
    expect(out).not.toContain("**bold**"); // inline markers are consumed
  });

  it("llm prefers the summary, else the markdown body", () => {
    const out = colophonFormatters.llm(FIXTURE);
    expect(out).toContain(`## ${BIN_NAME}`);
    expect(out).toContain("condensed distribution story"); // summary used
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
    expect((envelope.data as ColophonData).sections[0]?.kind).toBe(
      "distribution",
    );
  });

  it("--format llm selects the condensed Markdown form", async () => {
    const outcome = await executeVerb(
      colophonVerb,
      {},
      NO_MUT,
      bootRuntime(FLAGS_LLM, tmpCwd()),
    );
    expect(outcome.stdout).toContain(`## ${BIN_NAME}`);
  });
});

describe("colophon — MCP parity", () => {
  it("projects a read-only `colophon` tool that returns the distribution section", async () => {
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
    expect((envelope.data as ColophonData).sections[0]?.kind).toBe(
      "distribution",
    );
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
