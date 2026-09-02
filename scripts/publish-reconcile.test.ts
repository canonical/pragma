import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
	type PublicPackage,
	type RegistryAnswer,
	packumentPath,
	parsePackument,
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

describe("parsePackument", () => {
	const doc = (versions: string[]) =>
		JSON.stringify({
			name: "@canonical/utils",
			versions: Object.fromEntries(versions.map((v) => [v, { version: v }])),
		});

	test("a packument yields its version keys", () => {
		expect(parsePackument(200, doc(["0.34.0", "0.35.0", "0.36.0"]))).toEqual({
			kind: "versions",
			versions: ["0.34.0", "0.35.0", "0.36.0"],
		});
	});

	test("404 means never published, not an error", () => {
		// A package awaiting its first manual publish is a legitimate state.
		expect(parsePackument(404, '{"error":"Not found"}')).toEqual({
			kind: "never-published",
		});
	});

	test("any other non-200 is an error — an unreadable registry must not read as empty", () => {
		expect(parsePackument(503, "").kind).toBe("error");
		expect(parsePackument(500, "").kind).toBe("error");
		expect(parsePackument(401, "").kind).toBe("error");
	});

	test("a 200 that is not a packument is an error, never an empty answer", () => {
		expect(parsePackument(200, "<html>proxy</html>").kind).toBe("error");
		expect(parsePackument(200, "").kind).toBe("error");
		expect(parsePackument(200, "null").kind).toBe("error");
		// A document with no versions map is not the same as one with none.
		expect(parsePackument(200, '{"name":"x"}').kind).toBe("error");
	});

	test("an empty versions map is a real answer: published nothing", () => {
		expect(parsePackument(200, '{"versions":{}}')).toEqual({
			kind: "versions",
			versions: [],
		});
	});
});

describe("packumentPath", () => {
	test("a scoped name encodes its one slash", () => {
		expect(packumentPath("@canonical/summon-application")).toBe(
			"@canonical%2fsummon-application",
		);
	});

	test("an unscoped name is unchanged", () => {
		expect(packumentPath("lerna")).toBe("lerna");
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


