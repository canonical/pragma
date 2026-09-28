import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

describe("the sigstore 409 patch", () => {
	// patches/sigstore@4.1.0.patch flips fetchOnConflict so a Rekor
	// duplicate-entry 409 — the signature of a create-entry POST retried after
	// its response was lost — recovers by fetching the existing entry instead
	// of killing the publish. These tests pin the patch's coherence from the
	// manifests alone (no install needed): if the lockfile moves sigstore off
	// 4.1.0 or the patch entry is dropped, they fail and force a decision —
	// re-key the patch, or delete it because the upstream fix
	// (sigstore/sigstore-js#1709) has shipped.
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
