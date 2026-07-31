/**
 * The package tier, end to end: a noun the binary never shipped.
 *
 * A package that ships `stories/*.json` and is declared as a `file:` pack
 * contributes a working command to a project that declares it — resolved by
 * `sources update`, hashed into the pack, written into the pack directory, read
 * back storelessly at dispatch, and answered from the fixture graph. Proven both
 * in-process and through the COMPILED binary in a real subprocess.
 *
 * The same package also ships a malformed story and a schema-invalid one. Those
 * must be DROPPED, not fatal: package stories reach dispatch before the command
 * tree exists, so a throw there fails every command — including `sources update`
 * and `doctor`, the only two that can recover from it. Both of those are run
 * here after the bad stories are in the pack.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runTask } from "@canonical/task/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runChecks } from "../../capabilities/doctor/runChecks.js";
import { capabilities } from "../../capabilities/index.js";
import { buildUpdateTask } from "../../capabilities/sources/runUpdate.js";
import { loadEffectiveModules } from "../../kernel/packs/collect.js";
import { packDir, readActivePack } from "../../kernel/runtime/paths.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  bootFixtureRuntime,
  type FixtureGraph,
} from "../helpers/fixtureGraph.js";
import { runCli } from "../helpers/runCli.js";

const TTL = `
@prefix ex: <https://example.org/kitchen#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Recipe a owl:Class .
ex:name a owl:DatatypeProperty ; rdfs:domain ex:Recipe ; rdfs:range xsd:string .

ex:soup a ex:Recipe ; ex:name "Soup" .
ex:stew a ex:Recipe ; ex:name "Stew" .
`;

/** A valid read story — the noun the binary never shipped. */
const RECIPE_STORY = JSON.stringify({
  noun: "recipe",
  description: "List recipes.",
  colophon: "Recipes are modelled as ex:Recipe individuals.",
  list: {
    query:
      "SELECT ?uri ?name WHERE { ?uri a ex:Recipe ; ex:name ?name } ORDER BY ?name",
    columns: [{ field: "uri" }, { field: "name" }],
  },
});

/** Schema-invalid: a well-formed JSON document the pack grammar rejects. */
const INVALID_STORY = JSON.stringify({ noun: "Bad Noun", list: {} });

let graph: FixtureGraph;
beforeAll(async () => {
  graph = await bootFixtureRuntime({
    ttl: TTL,
    stories: {
      "recipe.json": RECIPE_STORY,
      // Not JSON at all.
      "broken.json": "{ this is not json",
      "invalid.json": INVALID_STORY,
    },
  });
}, 60_000);
afterAll(async () => {
  await graph.dispose();
});

describe("a package's stories reach the pack", () => {
  it("sources update carries all three story files into the pack, verbatim", () => {
    const hash = readActivePack(graph.cwd);
    expect(hash).toBeDefined();
    const carried = JSON.parse(
      readFileSync(join(packDir(hash as string), "stories.json"), "utf-8"),
    ) as { source: string; content: string }[];
    expect(carried.map((record) => record.source)).toEqual([
      "fixture/stories/broken.json",
      "fixture/stories/invalid.json",
      "fixture/stories/recipe.json",
    ]);
    expect(
      carried.find((r) => r.source === "fixture/stories/recipe.json")?.content,
    ).toBe(RECIPE_STORY);
  });
});

describe("a package-declared noun answers reads (in-process)", () => {
  it("recipe list returns rows from the package's own graph", async () => {
    const { modules } = await loadEffectiveModules(capabilities, graph.cwd);
    const recipe = modules.find((module) => module.name === "recipe");
    expect(recipe?.story).toBe(true);
    expect(recipe?.colophon).toBe(
      "Recipes are modelled as ex:Recipe individuals.",
    );
    const list = recipe?.verbs.find(
      (verb) => verb.path.join(" ") === "recipe list",
    ) as VerbSpec;
    const rows = (await list.run({}, graph.runtime)) as { name: string }[];
    expect(rows.map((row) => row.name)).toEqual(["Soup", "Stew"]);
  });

  it("names the unusable stories without failing the load", async () => {
    const { problems } = await loadEffectiveModules(capabilities, graph.cwd);
    expect(problems.map((problem) => problem.source).sort()).toEqual([
      "fixture/stories/broken.json",
      "fixture/stories/invalid.json",
    ]);
    // Each says WHY, not just that something was wrong.
    const invalid = problems.find((p) => p.source.endsWith("invalid.json"));
    expect(invalid?.message).toMatch(/Invalid story/);
  });
});

describe("the two recoveries still run with bad stories in the pack", () => {
  it("sources update re-resolves and reports the carried story count", async () => {
    const result = await runTask(await buildUpdateTask(graph.runtime));
    expect(result.packs).toEqual([
      {
        name: "fixture",
        resolved: expect.any(String),
        sourceCount: 1,
        storyCount: 3,
      },
    ]);
  });

  it("doctor passes `pack refs` and lists each ignored story as a failing item", async () => {
    const data = await runChecks(graph.runtime);
    const check = data.checks.find((entry) => entry.name === "pack refs");
    // The pack DOES answer reads, so the check passes…
    expect(check?.status).toBe("pass");
    expect(check?.detail).toContain("2 stories ignored");
    // …with the unusable stories named underneath it.
    expect(check?.items?.map((item) => item.label).sort()).toEqual([
      "fixture/stories/broken.json",
      "fixture/stories/invalid.json",
    ]);
    for (const item of check?.items ?? []) expect(item.status).toBe("fail");
  });
});

describe("the compiled binary answers the package's noun (subprocess)", () => {
  it("pragma recipe list --format json returns the package's rows", () => {
    const result = runCli(["recipe", "list", "--format", "json"], {
      cwd: graph.cwd,
    });
    expect(result.exitCode).toBe(0);
    const rows = (JSON.parse(result.stdout) as { data: { name: string }[] })
      .data;
    expect(rows.map((row) => row.name)).toEqual(["Soup", "Stew"]);
    // The bad stories are named on stderr, never on stdout — `--format json`
    // stays machine-readable.
    expect(result.stderr).toContain("fixture/stories/broken.json");
    expect(result.stderr).toContain("fixture/stories/invalid.json");
  });

  it("pragma capabilities lists the package's tools — the surface agents read", () => {
    // The MCP server registers its tools from the effective modules, so a
    // catalog built from the STATIC registry would omit exactly the nouns
    // `tools/list` advertises. `config show` points agents here for the verbs a
    // story produces; that pointer has to be true.
    const result = runCli(["capabilities", "--format", "json"], {
      cwd: graph.cwd,
    });
    expect(result.exitCode).toBe(0);
    const { data } = JSON.parse(result.stdout) as {
      data: { tools: { name: string }[] };
    };
    expect(data.tools.map((tool) => tool.name)).toContain("recipe_list");
  });

  it("pragma --help does NOT list recipe — the documented fast-path limit", () => {
    // `--help` reads the STATIC capability set (no config, no pack read), which
    // is what keeps its budget. A package-declared noun is dispatch-only.
    const help = runCli(["--help"], { cwd: graph.cwd });
    expect(help.exitCode).toBe(0);
    expect(help.stdout).not.toContain("recipe");
    // …and the command it does not advertise still runs (asserted above).
  });
});
