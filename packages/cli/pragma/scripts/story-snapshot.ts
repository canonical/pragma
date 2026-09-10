#!/usr/bin/env bun
/**
 * Story-answer snapshot — every list-shaped body's `--format json` answer, for
 * the K-1 kernel change and for any change after it.
 *
 * K-1 moved a story's declared filters and its `--limit`/`--after` pair INSIDE
 * the generated query. Its gate is that the declared stories answer exactly as
 * they did before, so the evidence has to be the answer a caller actually gets:
 * the built `dist/src/bin.js`, `--format json`, over the shipped pack. Anything
 * closer to the kernel (calling a run body, comparing rows) would compare the
 * thing that changed against itself.
 *
 * The cases are DERIVED from the declared stories, not listed: every list-shaped
 * body unfiltered, then each declared filter with every value its vocabulary
 * admits, plus a short search term. A story declared tomorrow is covered without
 * anyone editing this file.
 *
 * Usage: `bun run scripts/story-snapshot.ts <out.json>`, on each side of a
 * change, then `diff`. The envelope's `meta` rides along, so an added notice or
 * a changed recovery hint shows up as a difference rather than hiding.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { declaredStories } from "../src/capabilities/distribution.js";
import type { PackFilter, PackList } from "../src/kernel/packs/types.js";
import { bootRuntime } from "../src/kernel/runtime/boot.js";

const ENTRY = fileURLToPath(new URL("../dist/src/bin.js", import.meta.url));
const env = {
  ...process.env,
  XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "pragma-snap-cfg-")),
  XDG_STATE_HOME: mkdtempSync(join(tmpdir(), "pragma-snap-state-")),
  NO_COLOR: "1",
};

/** Run the built CLI and return its stdout, stderr and exit code verbatim. */
function run(args: readonly string[]): Record<string, unknown> {
  const result = spawnSync(process.execPath, [ENTRY, ...args], {
    encoding: "utf8",
    env,
  });
  return {
    argv: args,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** The values a value-free filter's declared vocabulary admits, read from the graph. */
async function vocabularyValues(filter: PackFilter): Promise<string[]> {
  if (filter.values) return [...filter.values];
  const vocabulary = filter.vocabulary;
  if (!vocabulary) return [];
  const rt = bootRuntime({
    llm: false,
    autoLlm: false,
    format: "json",
    verbose: false,
  });
  const result = await rt.query.sparql(vocabulary.query);
  if (result.type !== "select") return [];
  const variable = vocabulary.variable ?? filter.variable;
  return result.bindings
    .map((row) => row[variable] ?? "")
    .filter((value) => value !== "");
}

/** Every argv this snapshot runs for one list-shaped body. */
async function casesFor(
  noun: string,
  verb: string,
  shape: PackList,
): Promise<string[][]> {
  const base = [noun, verb, "--format", "json"];
  const cases: string[][] = [base];
  for (const filter of shape.filters ?? []) {
    for (const value of await vocabularyValues(filter)) {
      cases.push([...base, `--${filter.param}`, value]);
    }
    // An unadmitted value: the refusal, with the admissible values named.
    cases.push([...base, `--${filter.param}`, "definitely-not-a-value"]);
  }
  const filters = shape.filters ?? [];
  if (filters.length > 1) {
    // A conjunction, so a second filter narrowing the first stays pinned.
    const [first, second] = filters;
    const firstValues = first ? await vocabularyValues(first) : [];
    const secondValues = second ? await vocabularyValues(second) : [];
    if (first && second && firstValues[0] && secondValues[0]) {
      cases.push([
        ...base,
        `--${first.param}`,
        firstValues[0],
        `--${second.param}`,
        secondValues[0],
      ]);
    }
  }
  // A repeated flag is a union, and it is the case a naive query-side rewrite
  // duplicates rows on.
  const repeatable = filters[0];
  if (repeatable) {
    const values = await vocabularyValues(repeatable);
    if (values.length > 1) {
      cases.push([
        ...base,
        `--${repeatable.param}`,
        values[0] as string,
        `--${repeatable.param}`,
        values[1] as string,
      ]);
    }
  }
  if (shape.search) cases.push([...base, "--search", "a"]);
  return cases;
}

const out = process.argv[2];
if (!out) {
  console.error("usage: bun run scripts/story-snapshot.ts <out.json>");
  process.exit(2);
}

const snapshot: Record<string, unknown>[] = [];
for (const [noun, story] of declaredStories) {
  const bodies: [string, PackList][] = [];
  if (story.list) bodies.push(["list", story.list]);
  for (const verb of story.verbs ?? []) bodies.push([verb.verb, verb]);
  for (const [verb, shape] of bodies) {
    for (const argv of await casesFor(noun, verb, shape)) {
      snapshot.push(run(argv));
    }
  }
}
writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
console.error(`${snapshot.length} cases → ${out}`);
