// @vitest-environment node

/**
 * The SECOND ROOT's additivity claim, pinned against the emitted SDL.
 *
 * ---------------------------------------------------------------------------
 * MOVED HERE FROM THE DOCSITE APP (`src/server/graphqlSources.tests.ts`), with
 * its assertions unchanged and its filename changed from `.tests.ts` to
 * `.test.ts` — the app collects the plural form, every package in this repo
 * collects the singular, and a file keeping the wrong one is collected by
 * NOTHING and passes by not existing. It belongs here because what it measures
 * is the PROVIDER's source set, not anything the app does with the result.
 *
 * 🔴 ITS TWO FIXTURES ARE STALE, AND KNOWINGLY SO. Measured at pragma
 * `4d228c8` against `@canonical/prism-contract`: **12 violations each,
 * identical set** — `Node._meta` absent, `Node.uri` is `String!` not `ID!`, no
 * `EntityMeta.curie`/`title`/`label`/`comment`/`definition`, `OntologyClass`
 * neither carries `_meta` nor implements `Node`, no `ClassProperty.name`,
 * `OntologyProperty.uri` kind change. They predate the converged base.
 *
 * The header comment on each fixture carries the full measurement. The short
 * version of why they are still here:
 *
 *   - The property this suite asserts is ADDITIVITY OF THE SECOND ROOT, which
 *     is a property of the SOURCE SET and orthogonal to the structural head.
 *     Both sides of the comparison are equally stale, so it still holds.
 *   - The type inventory has NOT drifted: `schemaWithSecondRoot.sdl.txt`
 *     carries 183 top-level definitions, exactly the count of the live
 *     committed `schema.graphql`.
 *   - They cannot be regenerated in the authoring environment (no refs cache),
 *     and a capture taken from a partial cache is worse than a stale one
 *     because it looks current.
 *
 * The one claim below that is now FALSE is "the schema with BOTH roots
 * compiled — what the journeys lens reads": it is what the journeys lens read
 * two convergences ago. What that leaves open is measured only in part.
 * `integration/committedSdl.test.ts` checks the schema the app SHIPS — the
 * committed `schema.graphql` — against the live contract on every run, so the
 * structural head these captures are stale against is not unmeasured. But its
 * subject is a COMMITTED artifact, not a live emission: it cannot see that
 * file drift from what `createPragmaProvider` would emit today. That gap
 * stays open, and needs a boot with a populated refs cache to close. Its own
 * header says the same.
 * ---------------------------------------------------------------------------
 *
 * The docsite graph now compiles from two roots: the pragma CLI's refs
 * cache (design-system, code-standards, anatomy-dsl) and the semantics
 * working tree (surface, design-system-docs — the demand model the
 * journeys lens reads). Merging a second root into one store is only safe
 * if it is PURELY ADDITIVE: the four lenses that already ship read the
 * first root's types, and a field silently disappearing — or a new domain
 * assertion smearing fields onto an existing type — would break them
 * without any test in this app noticing.
 *
 * So the property asserted here is exactly that: over the SDL
 * relay-compiler consumes, every type that existed before the second root
 * still exists, and every field it carried is still there. The measurement
 * is structural (type name → field names parsed out of the SDL), because
 * the claim is about the schema's shape rather than any one query.
 *
 * THE EXCLUSION THIS RECORDS. `design-system-docs/data/shim-concept.ttl`
 * declares `ds:embodiesConcept` with `rdfs:domain ds:Entity`. `ds:Entity`
 * roots the design-system class tree, so that one assertion smears the
 * property and its inverse onto ALL FOURTEEN `ds:` types the moment both
 * roots compile together — every existing docsite type gains two fields it
 * never had. `EXCLUDED_SOURCES` drops that file.
 *
 * 🔴 WHAT THIS SUITE IS, AND IS NOT. It compares two CHECKED-IN CAPTURES to
 * each other and imports nothing from this package. Nothing here executes
 * `EXCLUDED_SOURCES`, `escapeChannelDottedRefs` or any other implementation
 * line, so it does not guard them: gut any of those and this suite stays
 * green. It is a historical, falsifiable statement about what adding the
 * second source root did to the schema's shape at the commit the captures
 * were taken — worth keeping, and worth not mistaking for a live guard.
 *
 * The live guards for the exclusion are `collectTtlSources.test.ts` and
 * `createPragmaProvider.test.ts`, which do boot and do execute it.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * BOTH sides of the comparison are captured fixtures, deliberately.
 *
 * The emitted SDL file is a GENERATED artifact: any process that
 * boots the backend rewrites it, and it is regenerated with only the first
 * root whenever the semantics tree is unavailable. A suite that read it
 * directly would therefore measure whichever boot happened to run last —
 * it would pass or fail on process ordering rather than on the property it
 * claims to test. So the two schemas are pinned here as fixtures instead,
 * and this suite compares FIXTURE to FIXTURE: a hermetic, order-independent
 * statement about what the second root does to the schema's shape.
 *
 * Regenerate the pair only when the sources legitimately change (boot the
 * backend once with the semantics tree present, once without), and say so
 * in the commit that does.
 *
 * They carry a `.sdl.txt` extension on purpose. In the docsite app,
 * `vite-plugin-relay-lite` compiles every Relay-tagged document in the project
 * as an OPERATION, and a schema definition is not one — under the compiler's
 * own extension these fixtures failed the transform before any test could run.
 * That plugin does not exist in this package and `.graphql` would now be
 * legal, but the name is kept: it makes the move a pure rename under
 * `git log --follow`, and the constraint is worth remembering the next time
 * someone captures a schema into an app.
 */
const readFixture = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../__fixtures__/${name}`, import.meta.url)),
    "utf-8",
  );

/**
 * The schema with BOTH roots compiled — what the journeys lens read at the
 * time of capture. See this file's header: that time is two convergences ago.
 */
const SDL = readFixture("schemaWithSecondRoot.sdl.txt");

/** The schema at `aea674000`, from the refs cache alone. */
const SDL_BEFORE = readFixture("schemaBeforeSecondRoot.sdl.txt");

/**
 * Parse the SDL into `type name → field names`. Deliberately simple: only
 * top-level definition headers and their directly-indented field lines
 * count, so docstrings (which are indented but quoted) and nested braces
 * never register as fields.
 */
const parseTypes = (sdl: string): ReadonlyMap<string, ReadonlySet<string>> => {
  const types = new Map<string, Set<string>>();
  let current: Set<string> | undefined;
  let inDocstring = false;
  for (const line of sdl.split("\n")) {
    const fenceCount = (line.match(/"""/g) ?? []).length;
    if (inDocstring) {
      if (fenceCount % 2 === 1) inDocstring = false;
      continue;
    }
    if (fenceCount % 2 === 1) {
      inDocstring = true;
      continue;
    }
    const header = /^(?:type|interface|input) (\w+)/.exec(line);
    if (header?.[1] !== undefined) {
      current = new Set();
      types.set(header[1], current);
      continue;
    }
    if (line === "}") {
      current = undefined;
      continue;
    }
    const field = /^ {2}(\w+)\s*[(:]/.exec(line);
    if (field?.[1] !== undefined && current !== undefined) {
      current.add(field[1]);
    }
  }
  return types;
};

const TYPES = parseTypes(SDL);
const TYPES_BEFORE = parseTypes(SDL_BEFORE);

/**
 * The pre-existing types the four shipped lenses read, with the field
 * count each carried BEFORE the second root landed — captured from the
 * SDL at commit `aea674000`. A drop here means the merge stopped being
 * additive; a rise on `Component` specifically means the shim exclusion
 * regressed.
 */
const ESTABLISHED_FIELD_COUNTS: Readonly<Record<string, number>> = {
  Component: 22,
  Ontology: 5,
  OntologyClass: 11,
  UIBlock: 21,
};

describe("the second source root", () => {
  it("loses no type from the pre-merge schema", () => {
    const missing = [...TYPES_BEFORE.keys()].filter((name) => !TYPES.has(name));
    expect(missing).toStrictEqual([]);
  });

  it("loses no FIELD from any pre-merge type", () => {
    const lost: string[] = [];
    for (const [name, fields] of TYPES_BEFORE) {
      const now = TYPES.get(name);
      if (now === undefined) continue;
      for (const field of fields) {
        if (!now.has(field)) lost.push(`${name}.${field}`);
      }
    }
    expect(lost).toStrictEqual([]);
  });

  it("widens only Query among the pre-merge types", () => {
    // Additive means: the second root contributes NEW types and NEW root
    // fields. Any other established type gaining a field is a domain
    // assertion smearing across the merge — the shim-concept failure mode.
    const widened = [...TYPES_BEFORE.keys()].filter((name) => {
      const before = TYPES_BEFORE.get(name)?.size ?? 0;
      const after = TYPES.get(name)?.size ?? 0;
      return after > before;
    });
    expect(widened).toStrictEqual(["Query"]);
  });

  it("keeps every established type", () => {
    for (const name of Object.keys(ESTABLISHED_FIELD_COUNTS)) {
      expect(TYPES.has(name), `${name} must survive the merge`).toBe(true);
    }
  });

  it("changes no established type's field count", () => {
    const actual = Object.fromEntries(
      Object.keys(ESTABLISHED_FIELD_COUNTS).map((name) => [
        name,
        TYPES.get(name)?.size,
      ]),
    );
    expect(actual).toStrictEqual(ESTABLISHED_FIELD_COUNTS);
  });

  it("does not smear the concept shim across the ds: types", () => {
    // With the shim excluded, `ds:embodiesConcept` (rdfs:domain ds:Entity)
    // does not reach `Component` in the capture. When these captures were
    // taken, removing the exclusion smeared the field — `Component` went
    // 22 → 23, gaining `embodiesConcepts` (the compiled name is the PLURAL).
    // Restoring the shim TODAY would not turn this red, because the capture
    // would not be retaken; the live assertion is in
    // `src/lib/sources/collectTtlSources.test.ts`. This names the culprit so
    // the record says what to look for.
    const component = TYPES.get("Component");
    expect(component?.has("embodiesConcepts")).toBe(false);
  });

  it("adds the demand model's types", () => {
    for (const name of [
      "Job",
      "Pairing",
      "Coordinate",
      "Persona",
      "Slot",
      "Lens",
    ]) {
      expect(TYPES.has(name), `${name} must exist`).toBe(true);
    }
  });

  it("pins a merged fixture the live backend can still reproduce", () => {
    // The fixtures are only trustworthy while they describe the same
    // sources the backend reads. This does not boot a store (too slow for
    // a unit suite — the e2e path proves the live schema); it asserts the
    // captured pair is internally coherent: the merged schema is a strict
    // superset, and it carries the demand model the first root cannot.
    expect(SDL.length).toBeGreaterThan(SDL_BEFORE.length);
    expect(SDL_BEFORE).not.toContain("sem://surface#");
    expect(TYPES.size).toBeGreaterThan(TYPES_BEFORE.size);
  });

  it("exposes Surface as an interface the pairing spine can fragment on", () => {
    expect(SDL).toContain("interface Surface");
    // The concrete surfaces a pairing can land on — the inline-fragment set.
    for (const name of ["View", "Lens", "Detail", "Peek", "Port"]) {
      expect(SDL).toContain(`type ${name} implements`);
    }
  });
});
