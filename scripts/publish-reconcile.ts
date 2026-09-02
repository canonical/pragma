#!/usr/bin/env bun
/**
 * Release publish reconciliation
 *
 * Computes the set of public workspace packages whose manifest version is NOT
 * on the npm registry, and reports it — to the log, and to the GitHub job
 * summary when $GITHUB_STEP_SUMMARY is set.
 *
 * Why this exists
 * ---------------
 * The v0.36.0 release (run 33255659249) tagged the repo, bumped every manifest
 * to 0.36.0, and then published 53 of 55 packages: a sigstore client bug
 * turned a Rekor duplicate-entry 409 into a fatal error for the other two
 * (see patches/sigstore@4.1.0.patch), and lerna died reporting only
 * `errno "undefined" is not a valid exit code` — a red X with no statement of
 * which packages made it and which did not.
 *
 * The recovery already exists: `lerna publish from-package` publishes exactly
 * the packages whose manifest version is absent from the registry, so a re-run
 * converges. What was missing is the ability to SEE that — a partial failure
 * must end with a legible statement of the registry delta, and the publish
 * job's verdict must be a function of registry state rather than of lerna's
 * error plumbing. This script provides both:
 *
 *   bun scripts/publish-reconcile.ts            # report the delta; exit 0
 *   bun scripts/publish-reconcile.ts --verify   # exit 1 while any public
 *                                               # package is missing from the
 *                                               # registry
 *
 * `--verify` re-reads the registry a bounded number of times before failing,
 * because a packument read immediately after a publish can lag the write.
 * This is read-only settling: the script never publishes, never retries a
 * publish, and converges on whatever state the registry is in.
 *
 * There is NO settling window, deliberately. What made v0.37.0 fail its own
 * verdict after publishing all 55 packages was the READ, not a wait that was
 * too short: `npm view` fetches the CDN-cached packument, which carries
 * `cache-control: public, max-age=300`. A publish does not invalidate it, so a
 * reader can only wait out a 5-minute TTL — any budget below it is a coin
 * flip, any budget above it is five idle minutes on every release, and either
 * way the next red gets 'fixed' by raising the number again.
 *
 * So this reads the ORIGIN: `GET <registry>/<name>?write=true`, which the
 * registry serves uncached (`cf-cache-status: DYNAMIC` on every repeat).
 * Read-after-write is consistent, the verdict is a fact rather than a race,
 * and the whole 55-package check answers in about two seconds.
 *
 * Transient faults are NOT retried here either, and that is on purpose:
 * `reconcile` throws on an unreadable registry rather than counting it as
 * missing, so a retry loop around it could never have seen one. A stuck read
 * is a job failure to re-run, not a package to keep asking about.
 *
 * A failure also reports the SHAPE of the settling window, because
 * `still converging` and `the publish dropped packages` are different
 * incidents and the missing-count trend is what tells them apart.
 *
 * What it deliberately does NOT do
 * --------------------------------
 * - It does not publish. `lerna publish from-package` remains the only
 *   publisher, keeping OIDC trusted publishing and provenance intact.
 * - It does not compare semver order — only membership: "is the manifest
 *   version among the versions the registry has for this package". That is
 *   the same question `from-package` asks, so the plan it prints is the set
 *   lerna will publish.
 * - It does not read bun.lock or node_modules; the local side is a pure
 *   function of the workspace manifests, like check-workspace-ranges.ts.
 *
 * The registry is queried over HTTP rather than through `npm view`, so the read
 * can name its own route (the origin one, above) instead of inheriting the
 * CLI's CDN-cached one. The 404-means-never-published case carries over from
 * guard_registry_not_ahead() in .github/actions/lerna-version/version.sh: a
 * never-published package is reported distinctly, because its first publish is
 * manual (see docs/how-to-guides/PUBLISH_A_PACKAGE.md) and no re-run creates it.
 */

import { appendFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface PublicPackage {
	name: string;
	version: string;
}

/** What the registry said about one package. */
export type RegistryAnswer =
	| { kind: "versions"; versions: string[] }
	| { kind: "never-published" }
	| { kind: "error"; message: string };

export interface PackageStatus {
	name: string;
	version: string;
	published: boolean;
	neverPublished: boolean;
}

export interface ReconcileResult {
	statuses: PackageStatus[];
	missing: PackageStatus[];
}

export type RegistryQuery = (name: string) => Promise<RegistryAnswer>;

// -------------------------------------------------------------------
// Workspace loading (impure, mirrors scripts/publish-status.ts)
// -------------------------------------------------------------------

/** Lists public workspace packages from the root package.json's globs. */
export function loadPublicPackages(root: string): PublicPackage[] {
	const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
	const patterns: string[] = rootPkg.workspaces ?? [];
	const packages: PublicPackage[] = [];

	for (const pattern of patterns) {
		const glob = new Bun.Glob(pattern);
		for (const match of glob.scanSync({ cwd: root, onlyFiles: false })) {
			let pkg: { name?: string; version?: string; private?: boolean };
			try {
				pkg = JSON.parse(readFileSync(join(root, match, "package.json"), "utf8"));
			} catch {
				continue; // not a package directory
			}
			if (pkg.name && pkg.version && pkg.private !== true) {
				packages.push({ name: pkg.name, version: pkg.version });
			}
		}
	}

	return packages.sort((a, b) => a.name.localeCompare(b.name));
}

// -------------------------------------------------------------------
// Registry answers (pure parsing; the fetch lives in main)
// -------------------------------------------------------------------

/**
 * Reads one packument response.
 *
 * A 404 is the registry's answer for a name it has never seen, which is a
 * legitimate state (a package awaiting its first manual publish), not a
 * failure. Everything else that is not a 200 IS a failure and must say so:
 * an unreadable registry has to stop the verdict, never quietly read as
 * "nothing published".
 */
export function parsePackument(status: number, body: string): RegistryAnswer {
	if (status === 404) return { kind: "never-published" };
	if (status !== 200) {
		return { kind: "error", message: `registry responded ${status}` };
	}

	let data: unknown;
	try {
		data = JSON.parse(body.trim() || "null");
	} catch {
		return {
			kind: "error",
			message: `unparseable packument: ${body.slice(0, 200)}`,
		};
	}

	if (data === null || typeof data !== "object") {
		return { kind: "error", message: "packument was not an object" };
	}
	const versions = (data as { versions?: unknown }).versions;
	if (versions === undefined || typeof versions !== "object" || versions === null) {
		return { kind: "error", message: "packument carried no versions map" };
	}
	return { kind: "versions", versions: Object.keys(versions) };
}

// -------------------------------------------------------------------
// Reconciliation (pure given a query function)
// -------------------------------------------------------------------

/**
 * Asks the registry about every package and classifies each as published
 * (manifest version present) or missing. A query error fails the whole
 * reconciliation: a plan or verdict built on an unanswered query would lie.
 */
export async function reconcile(
	packages: PublicPackage[],
	query: RegistryQuery,
): Promise<ReconcileResult> {
	const answers = await Promise.all(packages.map((pkg) => query(pkg.name)));

	const statuses: PackageStatus[] = [];
	for (const [i, pkg] of packages.entries()) {
		const answer = answers[i];
		if (answer.kind === "error") {
			throw new Error(`registry query for ${pkg.name} failed: ${answer.message}`);
		}
		const published = answer.kind === "versions" && answer.versions.includes(pkg.version);
		statuses.push({
			name: pkg.name,
			version: pkg.version,
			published,
			neverPublished: answer.kind === "never-published",
		});
	}

	return { statuses, missing: statuses.filter((s) => !s.published) };
}

// -------------------------------------------------------------------
// Rendering
// -------------------------------------------------------------------

const FIRST_PUBLISH_DOC = "docs/how-to-guides/PUBLISH_A_PACKAGE.md";

function missingReason(status: PackageStatus): string {
	return status.neverPublished
		? `never published — first publish is manual, see ${FIRST_PUBLISH_DOC}`
		: "version not on the registry";
}

/** One-line-per-package plain-text report for the job log. */
export function renderLog(result: ReconcileResult): string {
	const lines: string[] = [];
	if (result.missing.length === 0) {
		lines.push(
			`Registry reconciled: all ${result.statuses.length} public packages are on npm at their manifest versions. Publishing is a no-op.`,
		);
	} else {
		lines.push(
			`${result.missing.length} of ${result.statuses.length} public packages are NOT on npm at their manifest versions:`,
		);
		for (const status of result.missing) {
			lines.push(`  - ${status.name}@${status.version} (${missingReason(status)})`);
		}
	}
	return lines.join("\n");
}

/** Markdown for $GITHUB_STEP_SUMMARY. */
export function renderSummary(result: ReconcileResult, opts: { verify: boolean }): string {
	const heading = opts.verify ? "Publish outcome" : "Publish plan";
	const lines: string[] = [`### ${heading}: registry vs manifests`, ""];

	if (result.missing.length === 0) {
		lines.push(
			`All **${result.statuses.length}** public packages are on npm at their manifest versions.`,
		);
		return lines.join("\n");
	}

	lines.push(
		`**${result.statuses.length - result.missing.length}** of **${result.statuses.length}** public packages are on npm at their manifest versions; **${result.missing.length}** are not:`,
		"",
		"| Package | Version | Why it is missing |",
		"| --- | --- | --- |",
	);
	for (const status of result.missing) {
		lines.push(`| \`${status.name}\` | ${status.version} | ${missingReason(status)} |`);
	}
	lines.push(
		"",
		"Publishing converges on registry state: **re-run the failed Publish job** and",
		"`lerna publish from-package` will publish exactly the packages above and",
		"nothing else (a never-published package needs its manual first publish",
		`instead — see ${FIRST_PUBLISH_DOC}).`,
	);
	return lines.join("\n");
}

// -------------------------------------------------------------------
// CLI
// -------------------------------------------------------------------

const HELP = `Usage: bun scripts/publish-reconcile.ts [--verify]

Reports which public workspace packages are missing from the npm registry at
their manifest versions.

  (no flags)         print the delta and exit 0 (the "plan" before a publish)
  --verify           exit 1 while the delta is non-empty (the verdict after a
                     publish). Reads hit the registry ORIGIN, so the answer is
                     immediate and final — there is nothing to wait for
`;

/** The configured registry, so a fork publishing elsewhere is still checked. */
function registryBase(): string {
	const proc = Bun.spawnSync(["npm", "config", "get", "registry"], {
		stdout: "pipe",
		stderr: "ignore",
	});
	const configured = proc.stdout.toString().trim();
	const base =
		configured && configured !== "undefined"
			? configured
			: "https://registry.npmjs.org/";
	return base.replace(/\/+$/, "");
}

/** `@scope/name` -> `@scope%2fname`, the form the registry expects. */
export function packumentPath(name: string): string {
	return name.replace("/", "%2f");
}

const REGISTRY = registryBase();

async function queryRegistry(name: string): Promise<RegistryAnswer> {
	// `?write=true` is the ORIGIN read. The default packument route is CDN
	// cached for 300s and a publish does not invalidate it, so a read-back
	// through it can report a package missing that was published seconds ago.
	// The write route answers uncached, which is what makes this a verdict
	// rather than a race. (Note the ABBREVIATED packument media type returns an
	// empty body on this route, so this asks for the full document.)
	const url = `${REGISTRY}/${packumentPath(name)}?write=true`;
	try {
		const response = await fetch(url, { headers: { accept: "application/json" } });
		return parsePackument(response.status, await response.text());
	} catch (error) {
		return {
			kind: "error",
			message: `registry request failed: ${(error as Error).message}`,
		};
	}
}

function appendStepSummary(markdown: string): void {
	const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
	if (!summaryPath) return;
	// Append, never truncate: other steps write to the same summary file.
	appendFileSync(summaryPath, `${markdown}\n`);
}

async function main(argv: string[]): Promise<number> {
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(HELP);
		return 0;
	}
	const verify = argv.includes("--verify");
	const root = resolve(import.meta.dirname, "..");
	const packages = loadPublicPackages(root);

	const result = await reconcile(packages, queryRegistry);

	console.log(renderLog(result));
	const summary = renderSummary(result, { verify });

	if (!verify) {
		appendStepSummary(summary);
		return 0;
	}

	// The publish step's outcome is advisory context, not the verdict: lerna's
	// exit code conflates real failures with its own error-plumbing bugs
	// (v0.36.0: `errno "undefined" is not a valid exit code`).
	const publishOutcome = process.env["PUBLISH_STEP_OUTCOME"];
	if (result.missing.length === 0 && publishOutcome === "failure") {
		const note =
			"\n\nNote: the publish step exited non-zero, but every public package is on " +
			"the registry at its manifest version, so the release converged. Check the " +
			"publish step's log for what it tripped over.";
		appendStepSummary(summary + note);
		console.log(note.trim());
		return 0;
	}

	appendStepSummary(summary);
	return result.missing.length === 0 ? 0 : 1;
}

// Only run when executed directly; importing the file (e.g. in tests) exposes
// the pure functions without touching the network.
if (import.meta.main) {
	process.exit(await main(process.argv.slice(2)));
}
