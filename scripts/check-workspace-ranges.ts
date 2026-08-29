#!/usr/bin/env bun
/**
 * Workspace sibling range guard
 *
 * Fails when any workspace package declares a dependency range on another
 * workspace package that the sibling's CURRENT in-tree version does not
 * satisfy.
 *
 * Why this exists
 * ---------------
 * The v0.35.0 version bump (5198c5399) moved every package to 0.35.0 and
 * rewrote every `dependencies` / `devDependencies` range from ^0.34.0 to
 * ^0.35.0 — but left `peerDependencies` untouched. For a 0.x version
 * `^0.34.0` means `>=0.34.0 <0.35.0`, so 0.35.0 no longer satisfied it. Bun
 * then declined to link the workspace sibling and silently installed a
 * *published* copy from the registry into a nested node_modules instead. The
 * build died on `Cannot find module '@canonical/summon-core'` and main stayed
 * red.
 *
 * The class is "a manifest points at a sibling by a range the sibling has
 * outgrown". It is not specific to peerDependencies, and not specific to
 * Lerna: a hand edit or a different release tool produces the identical
 * breakage. So this guard is field-agnostic (all four dependency fields) and
 * tool-agnostic (it reads the manifests, not the tool's configuration), and
 * it enumerates packages from the root workspace globs rather than a list —
 * a hardcoded list of packages would be the same omission one level up.
 *
 * What it deliberately does NOT do
 * --------------------------------
 * - It says nothing about external (non-workspace) dependencies.
 * - It does not police WHICH range you use — `*`, `>=0.18.0` and `^0.35.0`
 *   are all fine as long as the sibling's version satisfies them.
 * - It does not read bun.lock or node_modules; it is a pure function of the
 *   manifests, so it needs no install and cannot be confused by a stale one.
 *
 * Usage:
 *   bun scripts/check-workspace-ranges.ts            # check the repo, exit 1 on violations
 *   bun scripts/check-workspace-ranges.ts --help
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

/** The four manifest fields that can carry a range pointing at a sibling. */
export const DEPENDENCY_FIELDS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

export type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

export interface WorkspacePackage {
	/** Repo-relative path to the package.json, for error messages. */
	file: string;
	name: string;
	version: string;
	deps: Partial<Record<DependencyField, Record<string, string>>>;
}

export interface Violation {
	file: string;
	field: DependencyField;
	/** The package declaring the range. */
	from: string;
	/** The workspace sibling being pointed at. */
	sibling: string;
	range: string;
	/** The sibling's actual in-tree version. */
	actual: string;
	/** Set when the range form itself could not be understood. */
	unparseable?: boolean;
}

// -------------------------------------------------------------------
// Semver: a deliberately small comparator
// -------------------------------------------------------------------
//
// `semver` is only available here transitively, and pulling a direct
// dependency into the root of a monorepo to answer "does 0.35.0 satisfy
// ^0.34.0" is a worse trade than fifty commented lines. The subset below
// covers every range form in use in this repo (surveyed across all 62
// workspace packages): `^x.y.z`, `~x.y.z`, `>=x.y.z <a.b.c`, `>=x.y.z`,
// exact pins, `*`, prerelease-tagged carets such as `^0.27.1-experimental.0`,
// and `||` alternation. Anything outside that subset is reported rather than
// waved through — see `parseRange`.

interface SemVer {
	major: number;
	minor: number;
	patch: number;
	/** Dot-separated prerelease identifiers; empty for a release version. */
	pre: string[];
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseVersion(input: string): SemVer | null {
	const m = VERSION_RE.exec(input.trim());
	if (!m) return null;
	return {
		major: Number(m[1]),
		minor: Number(m[2]),
		patch: Number(m[3]),
		pre: m[4] ? m[4].split(".") : [],
	};
}

/** Standard semver precedence, prerelease identifiers included. */
export function compareVersions(a: SemVer, b: SemVer): number {
	if (a.major !== b.major) return a.major < b.major ? -1 : 1;
	if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
	if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;

	// A version with a prerelease has LOWER precedence than one without.
	if (a.pre.length === 0 && b.pre.length === 0) return 0;
	if (a.pre.length === 0) return 1;
	if (b.pre.length === 0) return -1;

	for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
		const x = a.pre[i];
		const y = b.pre[i];
		// A shorter set of identifiers sorts lower when all preceding are equal.
		if (x === undefined) return -1;
		if (y === undefined) return 1;
		if (x === y) continue;
		const xn = /^\d+$/.test(x);
		const yn = /^\d+$/.test(y);
		// Numeric identifiers always compare lower than alphanumeric ones.
		if (xn && yn) return Number(x) < Number(y) ? -1 : 1;
		if (xn) return -1;
		if (yn) return 1;
		return x < y ? -1 : 1;
	}
	return 0;
}

type Op = "<" | "<=" | ">" | ">=" | "=";

interface Comparator {
	op: Op;
	version: SemVer;
}

const COMPARATOR_RE = /^(<=|>=|<|>|=|)\s*v?(.+)$/;

/**
 * Expand `^` / `~` into an explicit `>= <` pair.
 *
 * Caret is the one that bit us, because its upper bound moves with the
 * leading zero. From 1.0.0 up, the caret pins the major and floats the
 * minor: `^1.2.3` is `>=1.2.3 <2.0.0`. Below 1.0.0 the minor IS the
 * breaking position, so the caret pins that instead: `^0.34.0` is
 * `>=0.34.0 <0.35.0`, and a 0.35.0 sibling falls outside it. Had these
 * packages been at 1.x, `^1.34.0` would have been `>=1.34.0 <2.0.0`, the
 * 1.35.0 bump would have stayed inside it, and nobody would have noticed.
 */
function expandRangeOperator(prefix: "^" | "~", v: SemVer): Comparator[] {
	const lower: Comparator = { op: ">=", version: v };
	let upper: SemVer;
	if (prefix === "~") {
		// ~1.2.3 -> <1.3.0 ; ~0.2.3 -> <0.3.0
		upper = { major: v.major, minor: v.minor + 1, patch: 0, pre: [] };
	} else if (v.major > 0) {
		// ^1.2.3 -> <2.0.0
		upper = { major: v.major + 1, minor: 0, patch: 0, pre: [] };
	} else if (v.minor > 0) {
		// ^0.2.3 -> <0.3.0   (the 0.x case that broke main)
		upper = { major: 0, minor: v.minor + 1, patch: 0, pre: [] };
	} else {
		// ^0.0.3 -> <0.0.4
		upper = { major: 0, minor: 0, patch: v.patch + 1, pre: [] };
	}
	return [lower, { op: "<", version: upper }];
}

/**
 * Parse a range into a disjunction (`||`) of conjunctions (space-separated).
 * Returns null when any part is a form this guard does not model — the caller
 * reports that rather than assuming it passes.
 */
export function parseRange(range: string): Comparator[][] | null {
	const alternatives: Comparator[][] = [];
	for (const alt of range.split("||")) {
		const set: Comparator[] = [];
		const parts = alt.trim().split(/\s+/).filter(Boolean);
		// A bare `*` / `x` / empty range matches anything: an empty conjunction.
		if (parts.length === 0 || (parts.length === 1 && /^[*xX]$/.test(parts[0]))) {
			alternatives.push([]);
			continue;
		}
		for (const part of parts) {
			if (part === "-") return null; // hyphen ranges: not modelled
			if (part.startsWith("^") || part.startsWith("~")) {
				const v = parseVersion(part.slice(1));
				if (!v) return null;
				set.push(...expandRangeOperator(part[0] as "^" | "~", v));
				continue;
			}
			const m = COMPARATOR_RE.exec(part);
			if (!m) return null;
			const v = parseVersion(m[2]);
			if (!v) return null;
			set.push({ op: (m[1] || "=") as Op, version: v });
		}
		alternatives.push(set);
	}
	return alternatives;
}

function satisfiesComparator(v: SemVer, c: Comparator): boolean {
	const cmp = compareVersions(v, c.version);
	switch (c.op) {
		case "<":
			return cmp < 0;
		case "<=":
			return cmp <= 0;
		case ">":
			return cmp > 0;
		case ">=":
			return cmp >= 0;
		default:
			return cmp === 0;
	}
}

/**
 * Does `version` satisfy `range`?
 *
 * Returns null when the range form is not modelled, so callers can report
 * "I do not understand this" instead of silently passing it.
 */
export function satisfies(version: string, range: string): boolean | null {
	const v = parseVersion(version);
	if (!v) return null;
	const alternatives = parseRange(range);
	if (!alternatives) return null;

	for (const set of alternatives) {
		if (!set.every((c) => satisfiesComparator(v, c))) continue;
		// npm rule: a prerelease version only satisfies a comparator set that
		// mentions a prerelease at the same [major, minor, patch]. Otherwise
		// `>=0.1.0` would quietly match `0.2.0-alpha.1`.
		if (v.pre.length > 0) {
			const opted = set.some(
				(c) =>
					c.version.pre.length > 0 &&
					c.version.major === v.major &&
					c.version.minor === v.minor &&
					c.version.patch === v.patch,
			);
			if (!opted) continue;
		}
		return true;
	}
	return false;
}

// -------------------------------------------------------------------
// Range specifiers that are satisfied by construction
// -------------------------------------------------------------------

/**
 * Protocol specifiers that resolve to the in-tree sibling directly rather
 * than by version, so there is no range to outgrow. `workspace:*` is the
 * canonical one; `file:` / `link:` / `portal:` behave the same way.
 *
 * `workspace:^0.34.0` is NOT in this set: the version part is still a range
 * and can still be stale, so it is unwrapped and checked below.
 */
const LINK_PROTOCOLS = ["file:", "link:", "portal:"];

/** Strip a `workspace:` prefix, returning null if the spec links by path. */
function unwrapWorkspaceProtocol(range: string): string | null {
	const rest = range.slice("workspace:".length);
	// `workspace:*`, `workspace:^`, `workspace:~` and `workspace:` all mean
	// "whatever the sibling currently is" — satisfied by construction.
	if (rest === "" || rest === "*" || rest === "^" || rest === "~") return null;
	return rest;
}

// -------------------------------------------------------------------
// Workspace enumeration
// -------------------------------------------------------------------

/**
 * Read every workspace package's manifest, driven by the globs in the root
 * package.json `workspaces` field. Nothing is hardcoded: a package added to a
 * new directory is covered the moment the root glob covers it.
 */
export async function loadWorkspacePackages(rootDir: string): Promise<WorkspacePackage[]> {
	const rootManifest = JSON.parse(await readFile(join(rootDir, "package.json"), "utf8"));
	const globs: string[] = Array.isArray(rootManifest.workspaces)
		? rootManifest.workspaces
		: (rootManifest.workspaces?.packages ?? []);
	if (globs.length === 0) {
		throw new Error(
			`No workspace globs found in ${join(rootDir, "package.json")}. ` +
				"This guard enumerates packages from that field; with no globs it would " +
				"vacuously pass, which is worse than failing.",
		);
	}

	const files = new Set<string>();
	for (const pattern of globs) {
		const glob = new Bun.Glob(`${pattern}/package.json`);
		for await (const match of glob.scan({ cwd: rootDir })) {
			if (match.includes("node_modules")) continue;
			files.add(match);
		}
	}

	const packages: WorkspacePackage[] = [];
	for (const file of [...files].sort()) {
		const manifest = JSON.parse(await readFile(join(rootDir, file), "utf8"));
		if (!manifest.name || !manifest.version) continue;
		const deps: WorkspacePackage["deps"] = {};
		for (const field of DEPENDENCY_FIELDS) {
			if (manifest[field]) deps[field] = manifest[field];
		}
		packages.push({ file, name: manifest.name, version: manifest.version, deps });
	}
	return packages;
}

// -------------------------------------------------------------------
// The check itself
// -------------------------------------------------------------------

/**
 * Pure core: given the workspace manifests, return every sibling range the
 * sibling's own version does not satisfy. Exported so the test can build the
 * exact `^0.34.0` vs `0.35.0` case without touching the filesystem.
 */
export function findViolations(packages: WorkspacePackage[]): Violation[] {
	const versions = new Map<string, string>();
	for (const pkg of packages) versions.set(pkg.name, pkg.version);

	const violations: Violation[] = [];
	for (const pkg of packages) {
		for (const field of DEPENDENCY_FIELDS) {
			for (const [sibling, rawRange] of Object.entries(pkg.deps[field] ?? {})) {
				const actual = versions.get(sibling);
				// External dependency: none of this guard's business.
				if (actual === undefined) continue;

				let range = rawRange;
				if (LINK_PROTOCOLS.some((p) => range.startsWith(p))) continue;
				if (range.startsWith("npm:")) continue; // aliased to a different package
				if (range.startsWith("workspace:")) {
					const unwrapped = unwrapWorkspaceProtocol(range);
					if (unwrapped === null) continue; // linked by construction
					range = unwrapped;
				}

				const ok = satisfies(actual, range);
				if (ok === null) {
					violations.push({
						file: pkg.file,
						field,
						from: pkg.name,
						sibling,
						range: rawRange,
						actual,
						unparseable: true,
					});
				} else if (!ok) {
					violations.push({
						file: pkg.file,
						field,
						from: pkg.name,
						sibling,
						range: rawRange,
						actual,
					});
				}
			}
		}
	}
	return violations;
}

/**
 * The range to write in place of one a bump has outgrown.
 *
 * The leading operator is PRESERVED rather than normalised: a package that
 * pinned a sibling with `~` asked for patch-only drift and a fix must not
 * silently widen that to `^`. Anything else — a bare version, a range with no
 * recognised operator — becomes `^`, which is what every sibling range in this
 * repo already uses and what the report has always told people to write.
 *
 * A `workspace:` wrapper is carried across untouched: it changes who resolves
 * the range, not what the range means.
 *
 * @param range - The declared range, exactly as the manifest carries it.
 * @param actual - The sibling's real in-repo version.
 * @returns The replacement range, or null when the shape is not one to rewrite.
 */
export function repairedRange(range: string, actual: string): string | null {
	const wsPrefix = range.startsWith("workspace:") ? "workspace:" : "";
	const bare = range.slice(wsPrefix.length);
	// `workspace:*` / `workspace:~` / `workspace:^` link by construction and are
	// never violations, so reaching here with one means something is off.
	if (bare === "" || bare === "*") return null;
	const op = bare.startsWith("~") ? "~" : bare.startsWith("^") ? "^" : "^";
	return `${wsPrefix}${op}${actual}`;
}

/**
 * Rewrite one sibling range inside one manifest, textually.
 *
 * Textual and field-scoped rather than parse-and-reserialise: a manifest holds
 * ordering, spacing and comments-by-convention that a round-trip through
 * `JSON.parse` would silently reflow, turning a one-line release fix into a
 * whole-file diff. Scoping to the field matters because the same sibling
 * legitimately appears in several of them with different ranges — rewriting the
 * first match would move the wrong one.
 *
 * @returns The updated text, or null when the expected declaration was absent.
 */
export function rewriteDeclaration(
	text: string,
	field: DependencyField,
	sibling: string,
	range: string,
	replacement: string,
): string | null {
	const esc = (v: string): string =>
		v.replace(/[.*+?^${}()|[\]\\]/g, (m) => `\\${m}`);
	// Dependency blocks hold no nested objects, so `[^}]*` is a safe body match.
	const block = new RegExp(`("${field}"\\s*:\\s*\\{)([^}]*)(\\})`);
	const found = block.exec(text);
	if (found === null) return null;
	const [whole, open, body, close] = found as unknown as [
		string,
		string,
		string,
		string,
	];
	const decl = new RegExp(`("${esc(sibling)}"\\s*:\\s*")${esc(range)}(")`);
	if (!decl.test(body)) return null;
	return text.replace(whole, `${open}${body.replace(decl, `$1${replacement}$2`)}${close}`);
}

/**
 * Human-readable report. Written for someone who hits this in CI at 2am and
 * will not read this file: it names the manifest, the field, the range, the
 * sibling's real version, and the edit to make.
 */
export function formatViolations(violations: Violation[]): string {
	const lines: string[] = [];
	lines.push(
		`✗ ${violations.length} workspace sibling range${violations.length === 1 ? "" : "s"} ` +
			"cannot be satisfied by the sibling's current version.",
	);
	lines.push("");

	for (const v of violations) {
		lines.push(`  ${v.file}`);
		lines.push(`    ${v.field}."${v.sibling}": "${v.range}"`);
		if (v.unparseable) {
			lines.push(
				`    ${v.sibling} is at ${v.actual}, but this guard does not understand the range ` +
					`form "${v.range}", so it cannot prove the range is still valid.`,
			);
			lines.push(
				"    Fix: use a range form the guard models (^x.y.z, ~x.y.z, >=x.y.z, <x.y.z, " +
					"an exact version, *, workspace:*, or these joined by spaces / ||), or teach " +
					"scripts/check-workspace-ranges.ts the new form.",
			);
		} else {
			lines.push(
				`    ${v.sibling} is at ${v.actual} in this repo, which does NOT satisfy "${v.range}".`,
			);
			lines.push(
				`    Fix: in ${v.file}, set ${v.field}."${v.sibling}" to a range that admits ` +
					`${v.actual} — usually "^${v.actual}". Then re-run \`bun install\`.`,
			);
		}
		lines.push("");
	}

	lines.push("Why this matters:");
	lines.push(
		"  Bun only links the in-tree workspace copy of a sibling when the declared range",
	);
	lines.push(
		"  admits the sibling's version. When it does not, Bun silently installs a PUBLISHED",
	);
	lines.push(
		"  copy from the registry into a nested node_modules instead. Nothing errors at",
	);
	lines.push(
		"  install time; the build fails later with \"Cannot find module\" or, worse, succeeds",
	);
	lines.push("  against a stale published package.");
	lines.push("");
	lines.push(
		"  A version bump must rewrite sibling ranges in ALL of dependencies,",
	);
	lines.push(
		"  devDependencies, peerDependencies and optionalDependencies. The v0.35.0 bump",
	);
	lines.push("  (5198c5399) rewrote the first two only, and main went red.");

	return lines.join("\n");
}

// -------------------------------------------------------------------
// CLI
// -------------------------------------------------------------------

/** Walk up from `start` until a directory holds a package.json with workspaces. */
/**
 * Rewrite every repairable violation in place, one manifest read/write per file.
 *
 * Only ranges this tool UNDERSTANDS are touched: an unparseable range states an
 * intent no rule here can infer, so it is left exactly as written and reported
 * by the caller's second pass. Repairing what it can and re-reporting the rest
 * is deliberate — a release should not be blocked by the mechanical half of a
 * problem, and it must still stop for the half that needs a person.
 *
 * @param rootDir - The repository root.
 * @param violations - The violations from a completed check pass.
 * @returns How many declarations were actually rewritten.
 * @note Impure — reads and writes package manifests.
 */
async function repairViolations(
	rootDir: string,
	violations: readonly Violation[],
): Promise<number> {
	const byFile = new Map<string, Violation[]>();
	for (const v of violations) {
		if (v.unparseable === true) continue;
		byFile.set(v.file, [...(byFile.get(v.file) ?? []), v]);
	}

	let count = 0;
	for (const [file, items] of byFile) {
		const path = join(rootDir, file);
		let text = await readFile(path, "utf8");
		for (const v of items) {
			const replacement = repairedRange(v.range, v.actual);
			if (replacement === null) continue;
			const next = rewriteDeclaration(
				text,
				v.field,
				v.sibling,
				v.range,
				replacement,
			);
			if (next === null) continue;
			text = next;
			count++;
		}
		if (count > 0) await writeFile(path, text);
	}
	return count;
}

async function findRepoRoot(start: string): Promise<string> {
	let dir = start;
	for (;;) {
		try {
			const manifest = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
			if (manifest.workspaces) return dir;
		} catch {
			// keep walking
		}
		const parent = resolve(dir, "..");
		if (parent === dir) throw new Error(`No workspace root found above ${start}`);
		dir = parent;
	}
}

async function main(): Promise<number> {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(
			[
				"Usage: bun scripts/check-workspace-ranges.ts [--fix]",
				"",
				"Fails when a workspace package declares a dependency range on a workspace",
				"sibling that the sibling's current version does not satisfy, across",
				`${DEPENDENCY_FIELDS.join(", ")}.`,
				"",
				"--fix rewrites every repairable range in place, then reports what is left.",
				"",
				"Exit codes: 0 = every sibling range is satisfiable, 1 = at least one is not.",
			].join("\n"),
		);
		return 0;
	}

	const rootDir = await findRepoRoot(resolve(import.meta.dir, ".."));
	const packages = await loadWorkspacePackages(rootDir);
	let violations = findViolations(packages);

	if (process.argv.includes("--fix") && violations.length > 0) {
		const repaired = await repairViolations(rootDir, violations);
		if (repaired > 0) {
			console.log(
				`Rewrote ${repaired} sibling range${repaired === 1 ? "" : "s"} to match the ` +
					"sibling's current version.",
			);
			violations = findViolations(await loadWorkspacePackages(rootDir));
		}
	}

	if (violations.length === 0) {
		console.log(
			`✓ ${packages.length} workspace packages: every sibling range is satisfied by the ` +
				"sibling's current version.",
		);
		return 0;
	}

	console.error(formatViolations(violations));
	return 1;
}

// Only run the CLI when invoked directly, so the test can import the module.
if (import.meta.main) {
	process.exit(await main());
}
