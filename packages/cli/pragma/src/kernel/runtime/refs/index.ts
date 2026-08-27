/**
 * Package refs — turning what a project DECLARED into pinned, on-disk RDF.
 *
 * `sources update` is the only caller, and this domain is its whole
 * resolution: parse a `packs` entry into a typed reference, resolve that
 * reference to a revision and the TTL/story files it carries, and report what
 * the resulting set of sources says about itself. Three declaration kinds
 * (`npm`, `file`, `git`) resolve three different ways but converge on one
 * `ResolvedPackage`, so callers pin, hash, and build from a single shape.
 *
 * The prefix inspectors belong here rather than with the pack builder because
 * they answer a question about the RESOLVED SET, not about any one package: a
 * label two packages bind to different IRIs is a conflict nobody can see from
 * inside either one, and it must be caught before the sources are built rather
 * than after, when it would surface as a query that silently reads the wrong
 * namespace.
 *
 * `redactUrl` is on the surface because every one of these paths ends in a
 * message: a git URL may carry a token, and the caller that reports what it
 * resolved needs the redactor as much as it needs the result.
 *
 * The git operations underneath — clone, fetch, head — stay internal. They are
 * how `git` refs resolve, and they are safe because refs and URLs reach them
 * as argv and never as shell text; exposing them would offer the operations
 * without the parsing that validated their arguments.
 */

export type { PackageRef } from "./parseRef.js";
export { parsePackDeclaration, redactUrl } from "./parseRef.js";
export type {
  PrefixClash,
  ResolvedPackage,
  ResolveOptions,
} from "./resolve.js";
export {
  detectPrefixClashes,
  harvestPrefixes,
  resolvePackage,
} from "./resolve.js";
