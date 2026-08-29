#!/usr/bin/env bun
/**
 * Embedded-pack parity gate
 *
 * Fails when the graph snapshot the CLI ships
 * (`src/kernel/runtime/graphpack/embedded/pack.generated.ts`) cannot be shown
 * to match the pack sources `pragma.conf.ts` declares.
 *
 * Where it lives, and why: this is ONE package's data-provenance concern — it
 * reads this package's config and this package's committed embed — so it lives
 * in this package's `scripts/` and runs through this package's own `check`
 * (local mode) and `test` (its bun suite), which the root fan-out and the
 * build matrix already cover. Do NOT copy `scripts/check-workspace-ranges.ts`
 * here as a precedent for a root script + dedicated pr.yml job: that guard is
 * a genuine repo-wide invariant over every workspace sibling, which is what
 * earns shared CI infrastructure. Release mode runs from
 * `.github/actions/lerna-version/action.yml`, beside `check:ranges`, where a
 * red bar still stops the tag for free.
 *
 * Why this exists
 * ---------------
 * The CLI answers store-backed reads offline from a committed snapshot. That
 * snapshot is refreshed at release time by
 * `.github/actions/lerna-version/refresh-pack.sh`, which is token-gated and
 * skips loudly when no token is supplied (#1042). An honest skip is not a
 * gate: v0.36.0 shipped a snapshot whose manifest still said `0.34.0`, with
 * `@canonical/code-standards` built from commit `ab7ae14` while the config
 * pinned tag `v0.1.5` (= `fcd3ac2`) — a revision from BEFORE the upstream
 * `cs:name` → `rdfs:label` migration. `standard list` then published names
 * that `standard lookup` could not resolve, and no bar had turned red at any
 * point between the upstream change and the user hitting the break.
 *
 * What this gate proves — and what it cannot
 * ------------------------------------------
 * The embed's manifest records per-pack provenance
 * (`<name>@<git|npm|self>:<resolved>`). The declared sources come in two
 * strengths, and the gate is honest about the difference:
 *
 * - A source pinned to a TAG or SHA (today: `@canonical/code-standards` at
 *   `#v0.1.5`) has a stable referent, so equality is a stable predicate: the
 *   gate resolves the pin upstream and REQUIRES the recorded commit to match.
 *   This is the check that would have caught the v0.36.0 staleness.
 *
 * - A source floating on a BRANCH (`#main`) has no stable referent — the
 *   branch moves, so "recorded == resolved" is true or false depending on
 *   when you ask, and asserting it would make the gate red whenever upstream
 *   merges between bundle and check. For those packs the gate proves
 *   FRESHNESS instead: in release mode the manifest's `version` must equal
 *   the version being released, and the self pack must record
 *   `self:v<version>`. The bundler stamps both only when it actually ran, so
 *   this proves the snapshot was rebuilt during THIS release — its floating
 *   inputs were resolved at release time, not inherited from a previous tag.
 *   What it cannot prove is that the branch did not move in the minutes since
 *   the bundle ran; that window is inherent in declaring a floating ref, and
 *   the only way to close it is to pin (see the code-standards rationale in
 *   `pragma.conf.ts` — falsifiability is exactly why that pack IS pinned).
 *
 * Coverage is checked unconditionally and offline: the manifest must carry
 * exactly one provenance entry per declared pack, on the resolution lane the
 * bundler is committed to (`embedSources.ts`) — git for a git source, npm for
 * an overridden one, self for the repository's own pack.
 *
 * The no-token release
 * --------------------
 * Without a pack-source token the refresh skips, freshness fails, and the pin
 * cannot be resolved — so the release STOPS, which reverses #1042's default.
 * The escape hatch is explicit and visible, not silent: dispatching the
 * release with `accept_committed_snapshot: true` waives freshness and
 * unverifiability (both are then reported, loudly, in the job summary), but
 * NEVER a coverage violation or a pin mismatch the gate managed to prove — a
 * human may accept "possibly stale", no one may accept "provably wrong".
 *
 * Usage:
 *   bun run check:packs                          # local / PR mode
 *   bun run check:packs --release-version 0.37.0 # release gate
 *   bun run check:packs --release-version 0.37.0 --accept-committed-snapshot
 *
 * Exit codes: 0 = parity holds (as strongly as each declared ref allows),
 * 1 = at least one fatal finding.
 */

import { execFile } from "node:child_process";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

/** One pack as `pragma.conf.ts` declares it. */
export interface DeclaredPack {
  name: string;
  /** The config `source` string; absent means "resolve from npm". */
  source?: string;
}

/** One `<name>@<scheme>:<resolved>` entry parsed from the manifest. */
export interface ProvenanceEntry {
  name: string;
  scheme: string;
  resolved: string;
}

/** What a declared git ref resolves to upstream, or why it could not. */
export type RefResolution =
  | { kind: "tag" | "branch"; sha: string }
  | { kind: "missing" }
  | { kind: "unreachable"; error: string };

/** Resolves `ref` against `url` — injected so the core needs no network. */
export type ResolveRef = (url: string, ref: string) => RefResolution;

/** The classes of finding, used by the test suite and the formatter. */
export type FindingKind =
  | "coverage" // a declared pack absent from the manifest, or an entry no pack declares
  | "scheme" // recorded provenance on the wrong resolution lane
  | "pin-mismatch" // a pinned source provably differs from the shipped snapshot
  | "pin-unverifiable" // a pinned source that could not be resolved upstream
  | "stale" // release mode: the snapshot was not rebuilt by this release
  | "floating" // informational: a branch ref, equality is not a stable predicate
  | "self" // the repository's own pack recorded a provenance it cannot have
  | "proven"; // a pinned source shown equal to the shipped snapshot

/** One per-pack (or global) verdict. `fatal` findings fail the gate. */
export interface Finding {
  pack: string;
  kind: FindingKind;
  fatal: boolean;
  message: string;
}

/** Everything the pure core judges. */
export interface ParityInput {
  declared: readonly DeclaredPack[];
  manifest: { version: string; sourceRef: string };
  /** Pack names the bundler resolves from npm regardless of `source`. */
  overrideNames: readonly string[];
  /** The pack that is this repository (recorded as `self:v<version>`). */
  selfPack: string;
  resolve: ResolveRef;
  /** Set in the release gate: the version this release is becoming. */
  releaseVersion?: string;
  /** Explicit, human-dispatched waiver of freshness and unverifiability. */
  acceptCommittedSnapshot?: boolean;
}

// -------------------------------------------------------------------
// Parsing
// -------------------------------------------------------------------

/**
 * Parse the manifest's comma-joined `sourceRef` into provenance entries.
 *
 * The format is the bundler's `<name>@<kind>:<resolved>` — the same shape
 * doctor's `pack refs` check renders. An entry that does not parse is
 * returned with an empty scheme so the caller reports it as a coverage
 * problem rather than silently dropping provenance.
 */
export function parseSourceRef(sourceRef: string): ProvenanceEntry[] {
  return sourceRef
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry) => {
      const parsed = /^(.+)@(git|npm|self|file|link):(.+)$/.exec(entry);
      if (parsed === null) return { name: entry, scheme: "", resolved: "" };
      return {
        name: parsed[1] as string,
        scheme: parsed[2] as string,
        resolved: parsed[3] as string,
      };
    });
}

/** A declared `git+<url>#<ref>` source, split; null for any other shape. */
export function parseGitSource(
  source: string,
): { url: string; ref: string } | null {
  if (!source.startsWith("git+")) return null;
  const hashIdx = source.indexOf("#");
  if (hashIdx === -1 || hashIdx === source.length - 1) return null;
  return {
    url: source.slice("git+".length, hashIdx),
    ref: source.slice(hashIdx + 1),
  };
}

/** Whether a declared ref is itself a commit SHA (7–40 hex chars). */
export function isSha(ref: string): boolean {
  return /^[0-9a-f]{7,40}$/.test(ref);
}

// -------------------------------------------------------------------
// The check itself (pure core — resolution is injected)
// -------------------------------------------------------------------

/** Shorten a 40-char SHA to the 7 every other tool in this workflow shows. */
const short = (sha: string): string =>
  /^[0-9a-f]{40}$/.test(sha) ? sha.slice(0, 7) : sha;

/**
 * Judge one git-declared pack whose provenance entry is on the git lane.
 * Split out of {@link findParity} so the tag/branch/sha asymmetry — the heart
 * of this gate — reads in one place.
 */
function judgeGitPack(
  pack: DeclaredPack,
  entry: ProvenanceEntry,
  git: { url: string; ref: string },
  input: ParityInput,
): Finding {
  const { name } = pack;
  // A source pinned to a SHA needs no network at all.
  if (isSha(git.ref)) {
    const matches =
      entry.resolved === git.ref || entry.resolved.startsWith(git.ref);
    return matches
      ? {
          pack: name,
          kind: "proven",
          fatal: false,
          message: `pinned to ${short(git.ref)}; the snapshot was built from it`,
        }
      : {
          pack: name,
          kind: "pin-mismatch",
          fatal: true,
          message:
            `declared pin ${short(git.ref)} but the snapshot was built from ` +
            `${short(entry.resolved)} — the shipped graph does not match its declared source`,
        };
  }

  const resolution = input.resolve(git.url, git.ref);
  if (resolution.kind === "unreachable") {
    return {
      pack: name,
      kind: "pin-unverifiable",
      // Fatal only in release mode, and waivable there: locally / on a PR
      // runner the pack repositories are private and unreachable, which is
      // a fact about credentials, not about the snapshot.
      fatal:
        input.releaseVersion !== undefined &&
        input.acceptCommittedSnapshot !== true,
      message:
        `declared ref "#${git.ref}" could not be resolved upstream ` +
        `(${resolution.error}) — parity for this pack is UNVERIFIED`,
    };
  }
  if (resolution.kind === "missing") {
    return {
      pack: name,
      kind: "pin-mismatch",
      fatal: true,
      message:
        `declared ref "#${git.ref}" no longer exists upstream — ` +
        "`sources update` would fail for every user; fix the declaration",
    };
  }
  if (resolution.kind === "tag") {
    // A tag is a pin: equality is a stable predicate, so it is REQUIRED.
    return entry.resolved === resolution.sha
      ? {
          pack: name,
          kind: "proven",
          fatal: false,
          message: `pinned to tag ${git.ref} (${short(resolution.sha)}); the snapshot was built from it`,
        }
      : {
          pack: name,
          kind: "pin-mismatch",
          fatal: true,
          message:
            `declared tag ${git.ref} resolves to ${short(resolution.sha)} but the ` +
            `snapshot was built from ${short(entry.resolved)} — the shipped graph ` +
            "does not match its declared source; rebuild it (`bun run bundle` in packages/cli/pragma)",
        };
  }
  // A branch: no stable referent, so no equality claim — freshness (checked
  // globally) is what a release can prove. The comparison is still made and
  // REPORTED, because "matched the tip when this gate ran" vs "already
  // differs" is information a reader wants, just never a verdict.
  const drift =
    entry.resolved === resolution.sha
      ? `matches the branch tip (${short(resolution.sha)}) as of this check — not a stable guarantee`
      : `branch tip is ${short(resolution.sha)}, snapshot was built from ${short(entry.resolved)} — ` +
        "equality against a moving ref is not a checkable promise; freshness is what a release proves";
  return {
    pack: name,
    kind: "floating",
    fatal: false,
    message: `floats on "#${git.ref}": ${drift}`,
  };
}

/**
 * Pure core: judge the committed manifest against the declared packs.
 *
 * @returns Every finding, per pack first (declaration order) then global.
 *   The gate fails when any finding is fatal.
 */
export function findParity(input: ParityInput): Finding[] {
  const findings: Finding[] = [];
  const entries = parseSourceRef(input.manifest.sourceRef);
  const byName = new Map(entries.map((entry) => [entry.name, entry]));

  for (const pack of input.declared) {
    const entry = byName.get(pack.name);
    byName.delete(pack.name);
    if (entry === undefined) {
      findings.push({
        pack: pack.name,
        kind: "coverage",
        fatal: true,
        message:
          "declared in pragma.conf.ts but absent from the shipped snapshot's provenance — " +
          "the embed was not rebuilt after the declaration changed",
      });
      continue;
    }

    // Which resolution lane this pack's provenance must be on.
    if (pack.name === input.selfPack) {
      if (entry.scheme !== "self") {
        findings.push({
          pack: pack.name,
          kind: "scheme",
          fatal: true,
          message: `is this repository's own pack and must record self:v<version>, not ${entry.scheme}:${short(entry.resolved)}`,
        });
      } else if (entry.resolved !== `v${input.manifest.version}`) {
        findings.push({
          pack: pack.name,
          kind: "self",
          fatal: true,
          message:
            `records ${entry.resolved} while the manifest says ${input.manifest.version} — ` +
            "the snapshot disagrees with its own provenance",
        });
      } else {
        findings.push({
          pack: pack.name,
          kind: "proven",
          fatal: false,
          message: `built from this repository's own tree as ${entry.resolved}`,
        });
      }
      continue;
    }
    if (input.overrideNames.includes(pack.name)) {
      // The bundler resolves this pack from npm (embedSources.ts), so npm
      // provenance is the LEGITIMATE record here — and the honest limit:
      // the npm tarball is not the declared git ref, and nothing offline
      // can compare their contents.
      findings.push(
        entry.scheme === "npm"
          ? {
              pack: pack.name,
              kind: "floating",
              fatal: false,
              message:
                `resolved from npm ${entry.resolved} by build-environment override ` +
                "(embedSources.ts) — the declared git ref is not what the embed is built from, and this gate cannot compare the two",
            }
          : {
              pack: pack.name,
              kind: "scheme",
              fatal: true,
              message: `the bundler resolves this pack from npm, but the snapshot records ${entry.scheme}:${short(entry.resolved)}`,
            },
      );
      continue;
    }

    const git = pack.source === undefined ? null : parseGitSource(pack.source);
    if (git === null) {
      // A bare npm declaration (or a non-git source): npm provenance is
      // expected; a version comparison would need a registry query this
      // gate deliberately does not make.
      findings.push(
        entry.scheme === "npm"
          ? {
              pack: pack.name,
              kind: "floating",
              fatal: false,
              message: `resolved from npm ${entry.resolved} as declared`,
            }
          : {
              pack: pack.name,
              kind: "scheme",
              fatal: true,
              message: `declared as an npm pack but the snapshot records ${entry.scheme}:${short(entry.resolved)}`,
            },
      );
      continue;
    }
    if (entry.scheme !== "git") {
      findings.push({
        pack: pack.name,
        kind: "scheme",
        fatal: true,
        message: `declared as a git source but the snapshot records ${entry.scheme}:${short(entry.resolved)}`,
      });
      continue;
    }
    findings.push(judgeGitPack(pack, entry, git, input));
  }

  // Anything left in the manifest that no declaration covers.
  for (const [name] of byName) {
    findings.push({
      pack: name,
      kind: "coverage",
      fatal: true,
      message:
        "appears in the shipped snapshot's provenance but pragma.conf.ts no longer declares it — " +
        "the embed was not rebuilt after the declaration changed",
    });
  }

  // Freshness: the one thing a release can prove about floating sources.
  if (input.releaseVersion !== undefined) {
    if (input.manifest.version === input.releaseVersion) {
      findings.push({
        pack: "(snapshot)",
        kind: "proven",
        fatal: false,
        message: `rebuilt by this release (manifest version ${input.manifest.version}) — every floating source was resolved at release time`,
      });
    } else {
      findings.push({
        pack: "(snapshot)",
        kind: "stale",
        fatal: input.acceptCommittedSnapshot !== true,
        message:
          `was built for v${input.manifest.version}, not the v${input.releaseVersion} being released — ` +
          "this release would ship a snapshot inherited from an earlier tag" +
          (input.acceptCommittedSnapshot === true
            ? " (ACCEPTED by explicit accept_committed_snapshot dispatch input)"
            : "; supply a pack-source token so the refresh runs, or dispatch with accept_committed_snapshot: true to ship it anyway"),
      });
    }
  }

  return findings;
}

// -------------------------------------------------------------------
// Live resolution
// -------------------------------------------------------------------

/**
 * Resolve a declared ref with one `git ls-remote` call, classifying it as a
 * tag (peeled to the commit the bundler would have checked out) or a branch.
 *
 * `GIT_TERMINAL_PROMPT=0` so a private remote fails fast instead of hanging a
 * CI job on a credential prompt; authentication itself is whatever the
 * environment provides (the release job routes it through the same
 * `insteadOf` token config the refresh step installs).
 */
/** Classify one `git ls-remote` output for `ref` (pure — testable offline). */
export function classifyLsRemote(output: string, ref: string): RefResolution {
  const rows = new Map(
    output
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const [sha, name] = line.split(/\s+/);
        return [name ?? "", sha ?? ""] as const;
      }),
  );
  // An annotated tag peels via `^{}`; a lightweight tag IS the commit.
  const tagSha =
    rows.get(`refs/tags/${ref}^{}`) ?? rows.get(`refs/tags/${ref}`);
  if (tagSha !== undefined) return { kind: "tag", sha: tagSha };
  const branchSha = rows.get(`refs/heads/${ref}`);
  if (branchSha !== undefined) return { kind: "branch", sha: branchSha };
  return { kind: "missing" };
}

/**
 * Resolve every declared git ref up front, IN PARALLEL, into a table the sync
 * core reads. This runs inside every `bun run check` of this package, so the
 * network cost must be the slowest single ls-remote, not their sum.
 *
 * `GIT_TERMINAL_PROMPT=0` so a private remote fails fast instead of hanging a
 * CI job (or a contributor's offline `check`) on a credential prompt;
 * authentication itself is whatever the environment provides (the release job
 * routes it through the same `insteadOf` token config the refresh step
 * installs). A fully offline machine fails DNS in milliseconds and every pack
 * degrades to the reported-not-fatal `pin-unverifiable` local-mode finding.
 */
export async function resolveRefsInParallel(
  declared: readonly DeclaredPack[],
  skipNames: readonly string[],
): Promise<ResolveRef> {
  const targets = declared
    .filter((pack) => !skipNames.includes(pack.name))
    .map((pack) => (pack.source ? parseGitSource(pack.source) : null))
    .filter((git): git is { url: string; ref: string } => git !== null)
    .filter((git) => !isSha(git.ref));

  const table = new Map<string, RefResolution>();
  await Promise.all(
    targets.map(async ({ url, ref }) => {
      const key = `${url}#${ref}`;
      if (table.has(key)) return;
      const resolution = await new Promise<RefResolution>((done) => {
        execFile(
          "git",
          [
            "ls-remote",
            url,
            `refs/tags/${ref}`,
            `refs/tags/${ref}^{}`,
            `refs/heads/${ref}`,
          ],
          {
            timeout: 60_000,
            env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
          },
          (error, stdout) => {
            if (error) {
              done({
                kind: "unreachable",
                error: error.message.split("\n")[0] ?? "git ls-remote failed",
              });
              return;
            }
            done(classifyLsRemote(stdout, ref));
          },
        );
      });
      table.set(key, resolution);
    }),
  );
  return (url, ref) =>
    table.get(`${url}#${ref}`) ?? {
      kind: "unreachable",
      error: "ref was not pre-resolved",
    };
}

// -------------------------------------------------------------------
// Report
// -------------------------------------------------------------------

const ICONS: Record<string, string> = {
  proven: "✓",
  floating: "–",
  "pin-unverifiable": "?",
};

/** Human-readable report: one line per finding, worst news last. */
export function formatFindings(findings: Finding[]): string {
  const lines = findings
    .filter((finding) => !finding.fatal)
    .concat(findings.filter((finding) => finding.fatal))
    .map(
      (finding) =>
        `  ${finding.fatal ? "✗" : (ICONS[finding.kind] ?? "–")} ${finding.pack}: ${finding.message}`,
    );
  const fatal = findings.filter((finding) => finding.fatal);
  const verdict =
    fatal.length === 0
      ? "✓ The shipped snapshot matches its declared sources, as strongly as each declared ref allows."
      : `✗ ${fatal.length} parity violation${fatal.length === 1 ? "" : "s"}: the shipped snapshot cannot be shown to match its declared sources.`;
  return [...lines, "", verdict].join("\n");
}

// -------------------------------------------------------------------
// CLI
// -------------------------------------------------------------------

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      [
        "Usage: bun run check:packs [--] [--release-version <v>] [--accept-committed-snapshot]",
        "",
        "Verifies the CLI's committed embedded pack against the pack sources",
        "pragma.conf.ts declares. Pinned (tag/SHA) sources are equality-checked",
        "against upstream; floating (branch) sources are checked for release",
        "freshness, the strongest stable predicate a moving ref admits.",
        "",
        "--release-version <v>        release mode: the snapshot must have been",
        "                             rebuilt for exactly this version",
        "--accept-committed-snapshot  waive freshness/unverifiability (never a",
        "                             proven mismatch); for a deliberate,",
        "                             human-dispatched no-refresh release",
        "",
        "Exit codes: 0 = parity holds, 1 = at least one fatal finding.",
      ].join("\n"),
    );
    return 0;
  }

  const versionIdx = argv.indexOf("--release-version");
  const releaseVersion = versionIdx !== -1 ? argv[versionIdx + 1] : undefined;
  if (
    versionIdx !== -1 &&
    (releaseVersion === undefined || releaseVersion.startsWith("--"))
  ) {
    console.error("--release-version requires a value.");
    return 1;
  }

  // Imported lazily so the pure core stays importable (and testable) without
  // touching the ~2 MB generated module or the distribution config.
  const [{ default: conf }, { manifestJson }, { SELF_PACK, SOURCE_OVERRIDES }] =
    await Promise.all([
      import("../pragma.conf.js"),
      import("../src/kernel/runtime/graphpack/embedded/pack.generated.js"),
      import("./embedSources.js"),
    ]);
  const manifest = JSON.parse(manifestJson) as {
    version: string;
    sourceRef: string;
  };

  // A declaration may be a bare npm name or a `{ name, source }` object —
  // the same two shapes `parsePackDeclaration` accepts.
  const declared = conf.packs.map((pack) =>
    typeof pack === "string"
      ? { name: pack }
      : {
          name: pack.name,
          ...(pack.source !== undefined ? { source: pack.source } : {}),
        },
  );
  const overrideNames = Object.keys(SOURCE_OVERRIDES);
  const findings = findParity({
    declared,
    manifest,
    overrideNames,
    selfPack: SELF_PACK,
    resolve: await resolveRefsInParallel(declared, [
      ...overrideNames,
      SELF_PACK,
    ]),
    ...(releaseVersion !== undefined ? { releaseVersion } : {}),
    acceptCommittedSnapshot: argv.includes("--accept-committed-snapshot"),
  });

  const report = formatFindings(findings);
  const failed = findings.some((finding) => finding.fatal);
  (failed ? console.error : console.log)(report);

  // Release visibility: the waiver and every non-proven pack land in the job
  // summary, so an accepted no-refresh release says so where humans look.
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary !== undefined) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      summary,
      `### Embedded-pack parity\n\n\`\`\`\n${report}\n\`\`\`\n`,
    );
  }
  return failed ? 1 : 0;
}

// Only run the CLI when invoked directly, so the test can import the module.
if (import.meta.main) {
  process.exit(await main());
}
