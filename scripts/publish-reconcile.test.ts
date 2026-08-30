import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
	type PublicPackage,
	type RegistryAnswer,
	parseVersionsOutput,
	reconcile,
	renderLog,
	renderSummary,
} from "./publish-reconcile";

const pkg = (name: string, version: string): PublicPackage => ({ name, version });

/** Registry fake: maps package name to its published versions (null = E404). */
function registryOf(entries: Record<string, string[] | null>) {
	return async (name: string): Promise<RegistryAnswer> => {
		const versions = entries[name];
		if (versions === undefined) return { kind: "error", message: "unexpected package" };
		if (versions === null) return { kind: "never-published" };
		return { kind: "versions", versions };
	};
}

describe("parseVersionsOutput", () => {
	test("a JSON array of versions", () => {
		const answer = parseVersionsOutput('["0.34.0", "0.35.0", "0.36.0"]', 0);
		expect(answer).toEqual({ kind: "versions", versions: ["0.34.0", "0.35.0", "0.36.0"] });
	});

	test("a single-release package yields a bare string", () => {
		expect(parseVersionsOutput('"0.36.0"', 0)).toEqual({
			kind: "versions",
			versions: ["0.36.0"],
		});
	});

	test("E404 on stdout means never published, not an error", () => {
		// npm view --json reports failures as JSON on stdout (see
		// guard_registry_not_ahead in .github/actions/lerna-version/version.sh).
		const stdout = '{"error": {"code": "E404", "summary": "Not Found"}}';
		expect(parseVersionsOutput(stdout, 1)).toEqual({ kind: "never-published" });
	});

	test("a non-404 npm error is an error, never an empty answer", () => {
		const stdout = '{"error": {"code": "E503", "summary": "registry down"}}';
		const answer = parseVersionsOutput(stdout, 1);
		expect(answer.kind).toBe("error");
	});

	test("garbage output is an error, never an empty answer", () => {
		expect(parseVersionsOutput("npm WARN something", 0).kind).toBe("error");
		expect(parseVersionsOutput("", 1).kind).toBe("error");
	});
});

describe("the v0.36.0 partial failure", () => {
	// The exact shape of the incident: the repo is tagged, every manifest says
	// 0.36.0, 53 of 55 packages published, and two are still at 0.35.0 on npm.
	const workspace = [
		pkg("@canonical/i18n-react", "0.36.0"),
		pkg("@canonical/react-ds-core-form", "0.36.0"),
		pkg("@canonical/svelte-ds-app-wpe", "0.36.0"),
	];
	const registry = registryOf({
		"@canonical/i18n-react": ["0.35.0"],
		"@canonical/react-ds-core-form": ["0.35.0", "0.36.0"],
		"@canonical/svelte-ds-app-wpe": ["0.35.0"],
	});

	test("exactly the unpublished packages are reported missing", async () => {
		const result = await reconcile(workspace, registry);

		expect(result.missing.map((s) => s.name)).toEqual([
			"@canonical/i18n-react",
			"@canonical/svelte-ds-app-wpe",
		]);
		expect(result.missing.every((s) => !s.neverPublished)).toBe(true);
	});

	test("a second run after recovery is a clean no-op", async () => {
		const converged = registryOf({
			"@canonical/i18n-react": ["0.35.0", "0.36.0"],
			"@canonical/react-ds-core-form": ["0.35.0", "0.36.0"],
			"@canonical/svelte-ds-app-wpe": ["0.35.0", "0.36.0"],
		});

		const result = await reconcile(workspace, converged);

		expect(result.missing).toEqual([]);
		expect(renderLog(result)).toContain("no-op");
	});
});

describe("reconcile edge cases", () => {
	test("a never-published package is missing, flagged for manual first publish", async () => {
		const result = await reconcile(
			[pkg("@canonical/brand-new", "0.36.0")],
			registryOf({ "@canonical/brand-new": null }),
		);

		expect(result.missing).toHaveLength(1);
		expect(result.missing[0].neverPublished).toBe(true);
		expect(renderLog(result)).toContain("first publish is manual");
	});

	test("a registry query error fails the reconciliation rather than lying", async () => {
		const registry = registryOf({}); // answers "error" for everything
		expect(reconcile([pkg("@canonical/utils", "0.36.0")], registry)).rejects.toThrow(
			"registry query for @canonical/utils failed",
		);
	});

	test("a pre-release version is matched by membership like any other", async () => {
		const result = await reconcile(
			[pkg("@canonical/utils", "0.37.0-experimental.0")],
			registryOf({ "@canonical/utils": ["0.36.0", "0.37.0-experimental.0"] }),
		);
		expect(result.missing).toEqual([]);
	});
});

describe("reporting", () => {
	test("the summary names every missing package and the recovery action", async () => {
		const result = await reconcile(
			[pkg("@canonical/i18n-react", "0.36.0"), pkg("@canonical/utils", "0.36.0")],
			registryOf({
				"@canonical/i18n-react": ["0.35.0"],
				"@canonical/utils": ["0.36.0"],
			}),
		);

		const summary = renderSummary(result, { verify: true });
		expect(summary).toContain("`@canonical/i18n-react`");
		expect(summary).not.toContain("`@canonical/utils`");
		expect(summary).toContain("re-run the failed Publish job");
	});

	test("a converged registry reads as an explicit all-clear", async () => {
		const result = await reconcile(
			[pkg("@canonical/utils", "0.36.0")],
			registryOf({ "@canonical/utils": ["0.36.0"] }),
		);

		expect(renderSummary(result, { verify: false })).toContain("All **1** public packages");
	});
});

describe("the sigstore 409 patch", () => {
	// The other half of the v0.36.0 fix: patches/sigstore@4.1.0.patch flips
	// fetchOnConflict so a Rekor duplicate-entry 409 — the signature of a
	// create-entry POST retried after its response was lost — recovers by
	// fetching the existing entry instead of killing the publish. These tests
	// pin the patch's coherence from the manifests alone (no install needed):
	// if the lockfile moves sigstore off 4.1.0 or the patch entry is dropped,
	// they fail and force a decision — re-key the patch, or delete it because
	// the upstream fix (sigstore/sigstore-js#1709) has shipped.
	const root = resolve(import.meta.dirname, "..");
	const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

	test("package.json declares the patch", () => {
		expect(rootPkg.patchedDependencies?.["sigstore@4.1.0"]).toBe(
			"patches/sigstore@4.1.0.patch",
		);
	});

	test("the patch flips fetchOnConflict from false to true", () => {
		const patch = readFileSync(join(root, "patches/sigstore@4.1.0.patch"), "utf8");
		expect(patch).toContain("-            fetchOnConflict: false,");
		expect(patch).toContain("+            fetchOnConflict: true,");
	});

	test("the lockfile still resolves the patched sigstore version", () => {
		const lock = readFileSync(join(root, "bun.lock"), "utf8");
		expect(lock).toContain('"sigstore@4.1.0"');
		expect(lock).toContain('"patches/sigstore@4.1.0.patch"');
	});
});
