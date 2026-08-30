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
 * `--verify` re-reads the registry a bounded number of times (default 3
 * attempts, 20s apart) before failing, because a packument read immediately
 * after a publish can lag the write. This is read-only settling: the script
 * never publishes, never retries a publish, and converges on whatever state
 * the registry is in.
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
 * The registry is queried with `npm view <pkg> versions --json`, the same
 * idiom as guard_registry_not_ahead() in .github/actions/lerna-version/
 * version.sh, including its E404-means-never-published case. A never-published
 * package is reported distinctly: its first publish is manual (see
 * docs/how-to-guides/PUBLISH_A_PACKAGE.md) and no re-run will create it.
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
// Registry answers (pure parsing; the spawn lives in main)
// -------------------------------------------------------------------

/**
 * Interprets the stdout of `npm view <pkg> versions --json`.
 *
 * npm reports failures as JSON on stdout even with a non-zero exit:
 * `{"error": {"code": "E404", ...}}` — E404 means the package has never been
 * published, which for a workspace package is a real, reportable state (a new
 * package awaiting its manual first publish), not a query failure. A package
 * with a single release yields a bare string instead of an array.
 */
export function parseVersionsOutput(stdout: string, exitCode: number): RegistryAnswer {
	let data: unknown;
	try {
		data = JSON.parse(stdout.trim() || "null");
	} catch {
		return { kind: "error", message: `unparseable npm output: ${stdout.slice(0, 200)}` };
	}

	if (data !== null && typeof data === "object" && "error" in data) {
		const error = (data as { error: { code?: string; summary?: string } }).error;
		if (error?.code === "E404") return { kind: "never-published" };
		return { kind: "error", message: `${error?.code ?? "unknown"}: ${error?.summary ?? ""}` };
	}
	if (exitCode !== 0) {
		return { kind: "error", message: `npm view exited with status ${exitCode}` };
	}
	if (typeof data === "string") return { kind: "versions", versions: [data] };
	if (Array.isArray(data) && data.every((v) => typeof v === "string")) {
		return { kind: "versions", versions: data };
	}
	return { kind: "error", message: "npm view returned neither a version list nor an error" };
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

const HELP = `Usage: bun scripts/publish-reconcile.ts [--verify] [--attempts N] [--delay-seconds N]

Reports which public workspace packages are missing from the npm registry at
their manifest versions.

  (no flags)         print the delta and exit 0 (the "plan" before a publish)
  --verify           exit 1 while the delta is non-empty (the verdict after a
                     publish); re-reads the registry up to --attempts times,
                     --delay-seconds apart, to absorb read-after-write lag
  --attempts N       registry reads in --verify mode (default 3)
  --delay-seconds N  pause between --verify reads (default 20)
`;

async function queryRegistry(name: string): Promise<RegistryAnswer> {
	// --prefer-online defeats npm's local packument cache, which would
	// otherwise make the --verify settling reads return the same stale answer.
	const proc = Bun.spawn(["npm", "view", name, "versions", "--json", "--prefer-online"], {
		stdout: "pipe",
		stderr: "ignore",
	});
	const stdout = await new Response(proc.stdout).text();
	const exitCode = await proc.exited;
	return parseVersionsOutput(stdout, exitCode);
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
	const flag = (name: string, fallback: number): number => {
		const i = argv.indexOf(name);
		if (i === -1 || i + 1 >= argv.length) return fallback;
		const value = Number(argv[i + 1]);
		return Number.isFinite(value) && value > 0 ? value : fallback;
	};
	const attempts = verify ? flag("--attempts", 3) : 1;
	const delaySeconds = flag("--delay-seconds", 20);

	const root = resolve(import.meta.dirname, "..");
	const packages = loadPublicPackages(root);

	let result = await reconcile(packages, queryRegistry);
	for (let attempt = 1; result.missing.length > 0 && attempt < attempts; attempt++) {
		console.log(
			`${result.missing.length} package(s) not visible on the registry yet; re-reading in ${delaySeconds}s (attempt ${attempt + 1}/${attempts})...`,
		);
		await Bun.sleep(delaySeconds * 1000);
		result = await reconcile(packages, queryRegistry);
	}

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
