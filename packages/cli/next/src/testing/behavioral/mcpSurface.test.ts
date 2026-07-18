/**
 * B4 — sweep every MCP tool the live catalog exposes: callable with
 * representative args, returns a well-formed envelope, and its
 * `readOnlyHint`/`destructiveHint` annotations match the verb's capability.
 *
 * This IS PR4's "surface ⊆ covenant" proof for the read layer: rather than
 * re-asserting the static shape `capabilities/surface.test.ts` (PR3-owned)
 * already pins, this exercises every one of those blessed tools end-to-end.
 * Iterates `liveReadSurface.ts` (derived from `emitSurface(capabilities)`) —
 * no tool name is hard-coded, so this sweep covers PR5/6/7's tools with no
 * edit here once they land.
 *
 * Representative args are built structurally: a lookup/sample's positional
 * resolves through its noun's OWN `list` (browse-then-address, same as B1); a
 * `prefix`/`uri`-named positional (the grammar's TBox/entity-inspection
 * convention, used today by `ontology show`/`graph inspect`) resolves from the
 * pack index generically, not by noun name. A mutating tool is called WITHOUT
 * `confirm` (a safe plan-only preview).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { readPackIndex } from "../../kernel/completion/entitySource.js";
import {
  ALL_VISIBLE_CONFIG,
  CANONICAL_TTL,
} from "../fixtures/graph/canonical.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";
import { projectMcp } from "../helpers/projectMcp.js";
import { type LiveVerb, listVerbs, liveVerbs } from "./liveReadSurface.js";

/** Every verb exposed as an MCP tool — read AND mutating. */
const everyExposedVerb = liveVerbs.filter((v) => v.tool !== false);

let fixture: FixtureGraph;
let mcp: Awaited<ReturnType<typeof projectMcp>>;
/** noun -> first `list` row's name, for lookup/sample positionals. */
let firstNameByNoun: Map<string, string>;
/** The registered tool list, fetched once (annotations are call-invariant). */
let registeredTools: Awaited<ReturnType<typeof mcp.listTools>>;

beforeAll(async () => {
  fixture = await bootFixtureRuntime({
    ttl: CANONICAL_TTL,
    config: ALL_VISIBLE_CONFIG,
  });
  mcp = await projectMcp(capabilities, fixture.cwd);
  registeredTools = await mcp.listTools();

  firstNameByNoun = new Map();
  for (const v of listVerbs) {
    const result = await mcp.callTool(v.tool as string);
    const rows = result.data as { name: string }[] | undefined;
    const first = rows?.[0]?.name;
    if (first) firstNameByNoun.set(v.noun, first);
  }
});

afterAll(async () => {
  await mcp.cleanup();
  await fixture.dispose();
});

/** Build representative args for one verb's required positional(s), if any. */
function representativeArgs(v: LiveVerb): Record<string, unknown> {
  const required = v.spec.params.filter((p) => p.positional && p.required);
  if (required.length === 0) return {};
  const param = required[0];
  if (!param) return {};

  if (param.name === "prefix") {
    const prefix = Object.keys(readPackIndex(fixture.cwd)?.prefixes ?? {}).find(
      (p) => p !== "owl" && p !== "rdfs" && p !== "rdf" && p !== "xsd",
    );
    return { prefix: prefix ?? "ds" };
  }
  if (param.name === "uri") {
    const entity = readPackIndex(fixture.cwd)?.entities.find(
      (e) => e.box === "abox",
    );
    return { uri: entity?.prefixed ?? entity?.name ?? "" };
  }

  const known = firstNameByNoun.get(v.noun) ?? "placeholder";
  return { [param.name]: param.kind === "string[]" ? [known] : known };
}

describe("every MCP tool is callable and returns a well-formed envelope (B4)", () => {
  it("has tools to sweep", () => {
    expect(everyExposedVerb.length).toBeGreaterThan(0);
  });

  it.each(
    everyExposedVerb,
  )("$tool: callable, well-formed envelope, annotations match capability.mutates", async (v) => {
    const tool = v.tool as string;
    const args = representativeArgs(v);
    const result = await mcp.callTool(tool, args);

    expect(typeof result.ok).toBe("boolean");
    if (result.ok) {
      expect("data" in result).toBe(true);
      expect(typeof result.meta).toBe("object");
    } else {
      const error = result.error as { code?: unknown; message?: unknown };
      expect(typeof error.code).toBe("string");
      expect(typeof error.message).toBe("string");
    }

    const registered = registeredTools.find((t) => t.name === tool);
    expect(registered).toBeDefined();
    const annotations = registered?.annotations as
      | { readOnlyHint?: boolean; destructiveHint?: boolean }
      | undefined;
    expect(annotations?.readOnlyHint).toBe(!v.mutates);
    if (v.spec.capability.destructive !== undefined) {
      expect(annotations?.destructiveHint).toBe(v.spec.capability.destructive);
    }
  });
});
