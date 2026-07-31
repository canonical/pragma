/**
 * The first-install journey — this PR's whole point, pinned.
 *
 * A machine with no cache, no pointer, no network and an empty cwd must answer
 * real store-backed reads from the embedded pack, and must say honestly where
 * those answers come from. Equally: a project that declared its OWN packs and
 * never built them must NOT be handed the distribution's graph — it is a
 * different graph, and quietly serving it is the failure the boot decision
 * exists to prevent.
 *
 * Assertions pin MEMBERSHIP, never counts: the row counts move whenever the
 * upstream design system does, but a design system with no `Button`, or a tier
 * hierarchy with no `Global`, is a change a human should be made to look at.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { blockModule } from "../../capabilities/block/index.js";
import { storyModules } from "../../capabilities/distribution.js";
import { checkPackageRefs } from "../../capabilities/doctor/checks/checkPackageRefs.js";
import { promptListVerb } from "../../capabilities/prompt/verbs.js";
import { collectStatus } from "../../capabilities/sources/collectStatus.js";
import { tokenModule } from "../../capabilities/token/index.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { executeVerb } from "../../kernel/project/cli/dispatch.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import type { GlobalFlags } from "../../kernel/runtime/types.js";
import type { CapabilityModule, VerbSpec } from "../../kernel/spec/types.js";

const JSON_FLAGS: GlobalFlags = {
  llm: false,
  autoLlm: false,
  format: "json",
  verbose: false,
};
const NO_MUTATION = { dryRun: false, undo: false, yes: false };

const standardModule = storyModules.get("standard");
if (!standardModule) {
  throw new Error('pragma.conf.ts declares no story for "standard"');
}
const tierModule = storyModules.get("tier");
if (!tierModule) {
  throw new Error('pragma.conf.ts declares no story for "tier"');
}

const verbOf = (module: CapabilityModule, path: string): VerbSpec =>
  module.verbs.find((verb) => verb.path.join(" ") === path) as VerbSpec;

/** A cwd with nothing in it — the cold-install shape (the XDG dirs are isolated). */
const emptyCwd = (): string => mkdtempSync(join(tmpdir(), "pragma-first-"));

/**
 * A cwd whose `pragma.config.ts` declares its own packs and has never been
 * built — `origins.packs` is "project", so the embedded pack must not answer.
 */
function unbuiltProjectCwd(): string {
  const cwd = mkdtempSync(join(tmpdir(), "pragma-unbuilt-"));
  writeFileSync(
    join(cwd, "pragma.config.ts"),
    'export default { packs: [{ name: "mine", source: "file:///pragma-never-built" }] };\n',
  );
  return cwd;
}

/** Run a read verb at a cwd and return the parsed `data` payload. */
async function readData(verb: VerbSpec, cwd: string): Promise<unknown> {
  const outcome = await executeVerb(
    verb,
    {},
    NO_MUTATION,
    bootRuntime(JSON_FLAGS, cwd),
  );
  return (JSON.parse(outcome.stdout as string) as { data: unknown }).data;
}

describe("first install — an empty cwd answers real reads offline", () => {
  it("block list resolves the design system's blocks", async () => {
    const rows = (await readData(
      verbOf(blockModule, "block list"),
      emptyCwd(),
    )) as { name: string }[];
    expect(rows.map((row) => row.name)).toContain("Button");
  });

  it("standard list resolves the code standards", async () => {
    const rows = (await readData(
      verbOf(standardModule, "standard list"),
      emptyCwd(),
    )) as { uri: string; name: string }[];
    expect(rows.length).toBeGreaterThan(0);
    // Every row is a code standard from the standards pack's own namespace.
    for (const row of rows) {
      expect(row.uri).toContain("codestandards#");
    }
  });

  it("tier list resolves the tier hierarchy", async () => {
    const rows = (await readData(
      verbOf(tierModule, "tier list"),
      emptyCwd(),
    )) as { name: string }[];
    expect(rows.map((row) => row.name)).toContain("Global");
  });
});

describe("first install — empty results are honest, not papered over", () => {
  it("token list exits calmly with no rows (the graph carries no ds:Token)", async () => {
    expect(
      await readData(verbOf(tokenModule, "token list"), emptyCwd()),
    ).toEqual([]);
  });

  it("prompt list exits calmly with no prompts (the graph carries no ds:Prompt)", async () => {
    expect(await readData(promptListVerb as VerbSpec, emptyCwd())).toEqual({
      prompts: [],
    });
  });
});

describe("first install — a project with its own unbuilt packs is refused", () => {
  it("a read throws STORE_UNAVAILABLE naming `pragma sources update`", async () => {
    let caught: unknown;
    try {
      await readData(verbOf(blockModule, "block list"), unbuiltProjectCwd());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PragmaError);
    expect((caught as PragmaError).code).toBe("STORE_UNAVAILABLE");
    expect((caught as PragmaError).recovery?.cli).toBe("pragma sources update");
  });

  it("doctor reports it as a failure, not a healthy install", async () => {
    const result = await checkPackageRefs(
      bootRuntime(JSON_FLAGS, unbuiltProjectCwd()),
    );
    expect(result.status).toBe("fail");
    expect(result.detail).toContain("the store has not been built");
    expect(result.remedy).toBe("pragma sources update");
  });
});

describe("first install — the surfaces say where the answers come from", () => {
  it("sources status reports the embedded snapshot with its provenance", async () => {
    const status = await collectStatus(bootRuntime(JSON_FLAGS, emptyCwd()));
    expect(status.store).toBe("embedded");
    // The upstream revisions the snapshot was compiled from — never "up to date".
    expect(status.sourceRef).toContain("@canonical/design-system@");
    expect(status.entityCount).toBeGreaterThan(0);
  });

  it("doctor passes, naming the embedded snapshot rather than the config", async () => {
    const result = await checkPackageRefs(bootRuntime(JSON_FLAGS, emptyCwd()));
    expect(result.status).toBe("pass");
    expect(result.detail).toContain("embedded snapshot @ ");
    expect(result.detail).toContain("pragma sources update");
  });
});
