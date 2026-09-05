/**
 * Walking pragma's two source roots into one ordered, escaped, filtered list.
 *
 * The graph compiles from TWO roots into ONE store:
 *
 *   1. the pragma CLI's refs cache — for each cached source package
 *      (design-system, code-standards, anatomy-dsl), every `.ttl` under
 *      `definitions/` and `data/`;
 *   2. the semantics working tree — the `surface` ontology and the
 *      `design-system-docs` graph that instantiates it: the docsite's own
 *      demand model (jobs, coordinates, pairings, surfaces, layouts), which
 *      the journeys lens reads.
 *
 * Both roots skip dot-prefixed entries (editor and channel artifacts such as
 * `.modifier.dark.ttl` are not graph sources, and a dot-prefixed Turtle local
 * name is not even valid RDF).
 *
 * WHY THIS TAKES ROOTS RATHER THAN READING THE ENVIRONMENT. In the app this
 * function resolved `$PRAGMA_REFS_DIR` itself, which made it untestable: the
 * only way to exercise it was to have a populated refs cache. Roots are now an
 * argument, `resolveRefsRoot`/`resolveSemRoot` are separately testable, and
 * the package's whole test suite runs against a checked-in corpus
 * (`src/testing/__fixtures__/corpus`) that needs neither cache nor semantics tree.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  CHANNEL_DOTTED_REF,
  DEFAULT_REFS_ROOT,
  DEFAULT_SEM_ROOT,
  EXCLUDED_SOURCES,
  REF_NAME,
  REF_PACKAGES,
  SEM_PACKAGES,
  type SourceRoots,
  TTL_DIRS,
  type TtlSource,
} from "../config/index.js";

/** Escape channel-dotted local names so strict Turtle parsers accept them. */
export const escapeChannelDottedRefs = (content: string): string =>
  content.replace(CHANNEL_DOTTED_REF, "$1:\\.");

/** The refs root: `$PRAGMA_REFS_DIR` or the pragma CLI's cache location. */
export const resolveRefsRoot = (): string =>
  process.env.PRAGMA_REFS_DIR ?? DEFAULT_REFS_ROOT;

/** The semantics root: `$PRAGMA_SEM_DIR` or the sibling working tree. */
export const resolveSemRoot = (): string =>
  process.env.PRAGMA_SEM_DIR ?? DEFAULT_SEM_ROOT;

/**
 * Order sources by store-visible path.
 *
 * A stable, byte-deterministic order matters: the emitted SDL's field and type
 * ordering follows the order the store saw its sources in, and the committed
 * `schema.graphql` is a tracked file that must not churn between boots.
 *
 * PRECONDITION: paths are unique. A path is `<package>/<path within package>`,
 * packages are distinct within each root and `REF_PACKAGES` and `SEM_PACKAGES`
 * are disjoint, so two collected sources cannot share one. That is why there
 * is no equal arm — not an oversight. An equal arm here would be dead code
 * that no test could reach, and dead code in a comparator is a worse thing to
 * ship than a stated precondition.
 */
const byPath = (a: TtlSource, b: TtlSource): number =>
  a.path < b.path ? -1 : 1;

/**
 * The store-visible path of one collected source: `<package>/<path within the
 * package>`, always spelled with forward slashes.
 *
 * `relative()` answers in the PLATFORM's separator, so on Windows this would
 * read `design-system-docs\data\shim-concept.ttl` — a spelling that matches no
 * `EXCLUDED_SOURCES` entry (the excluded shim would be compiled into the
 * schema) and that sorts differently from the one every other machine
 * produces, which the byte-deterministic source order below depends on. The
 * separator is normalised here, once, at the point the path is minted.
 */
const storeVisiblePath = (label: string, base: string, full: string): string =>
  `${label}/${relative(base, full).split(sep).join("/")}`;

/** Recursively collect `*.ttl` files under a directory, skipping dotfiles. */
export const walkTtl = (
  dir: string,
  base: string,
  label: string,
  out: TtlSource[],
): void => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTtl(full, base, label, out);
    } else if (entry.isFile() && entry.name.endsWith(".ttl")) {
      out.push({
        path: storeVisiblePath(label, base, full),
        content: escapeChannelDottedRefs(readFileSync(full, "utf-8")),
      });
    }
  }
};

/**
 * Collect every TTL source across the configured ref and sem packages.
 *
 * @note Impure — reads the given roots from disk.
 */
export const collectTtlSources = ({
  refsRoot,
  semRoot,
}: SourceRoots): TtlSource[] => {
  if (!existsSync(refsRoot)) {
    throw new Error(
      `pragma refs cache not found at ${refsRoot} — run \`pragma sources update\` (or set PRAGMA_REFS_DIR).`,
    );
  }
  const sources: TtlSource[] = [];
  for (const pkg of REF_PACKAGES) {
    const root = join(refsRoot, pkg, REF_NAME);
    for (const sub of TTL_DIRS) {
      walkTtl(join(root, sub), root, pkg, sources);
    }
  }
  if (sources.length === 0) {
    throw new Error(
      `no .ttl sources found under ${refsRoot} — run \`pragma sources update\`.`,
    );
  }
  // The second root is OPTIONAL by design — the four shipped lenses read the
  // first root only, so a missing semantics tree must degrade rather than
  // break. It must not degrade SILENTLY, though: its default location is a
  // sibling working tree, which most machines do not have, and without it the
  // whole demand model (Job, Pairing, Coordinate, Persona, Slot, Lens) is
  // absent from the schema. A boot that says nothing is indistinguishable
  // from a healthy one, and that is how a half-empty schema ships.
  if (existsSync(semRoot)) {
    for (const pkg of SEM_PACKAGES) {
      const root = join(semRoot, pkg);
      const before = sources.length;
      for (const sub of TTL_DIRS) {
        walkTtl(join(root, sub), root, pkg, sources);
      }
      // A root that EXISTS is not a root that answers. `PRAGMA_SEM_DIR`
      // pointing at a partial checkout, or a package renamed upstream, leaves
      // `walkTtl` contributing nothing while the success log below still
      // reports a healthy boot — the same silent half-empty schema the
      // missing-directory warning exists to prevent, arrived at by a route
      // that check cannot see. Counted per package, so the warning names the
      // part of the demand model that is actually absent.
      if (sources.length === before) {
        console.warn(
          `[graphql] semantics package "${pkg}" contributed no .ttl sources from ${root} — the part of the demand model it carries will be absent from the schema. Check that PRAGMA_SEM_DIR names a complete semantics tree.`,
        );
      }
    }
  } else {
    console.warn(
      `[graphql] semantics tree not found at ${semRoot} — compiling the first source root only. The demand model (${SEM_PACKAGES.join(", ")}) will be absent from the schema. Set PRAGMA_SEM_DIR to point at it.`,
    );
  }
  const collected = sources.filter(
    (source) => !EXCLUDED_SOURCES.includes(source.path),
  );
  collected.sort(byPath);
  return collected;
};
