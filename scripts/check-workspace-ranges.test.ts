import { describe, expect, test } from "bun:test";

import {
	DEPENDENCY_FIELDS,
	type DependencyField,
	type WorkspacePackage,
	findViolations,
	loadWorkspacePackages,
	repairedRange,
	rewriteDeclaration,
	satisfies,
} from "./check-workspace-ranges";

/** Build a minimal workspace package manifest for the pure core. */
function pkg(
	name: string,
	version: string,
	deps: Partial<Record<DependencyField, Record<string, string>>> = {},
): WorkspacePackage {
	return { file: `packages/${name}/package.json`, name, version, deps };
}

describe("the regression that broke main", () => {
	// This is the exact shape of packages/summon/component/package.json after
	// commit 5198c5399: the package moved to 0.35.0, the sibling moved to
	// 0.35.0, and the peerDependencies range stayed at ^0.34.0.
	const workspace = [
		pkg("@canonical/summon-component", "0.35.0", {
			dependencies: { "@canonical/utils": "^0.35.0" },
			peerDependencies: { "@canonical/summon-core": "^0.34.0" },
		}),
		pkg("@canonical/summon-core", "0.35.0"),
		pkg("@canonical/utils", "0.35.0"),
	];

	test("^0.34.0 against a 0.35.0 sibling is reported", () => {
		const violations = findViolations(workspace);

		expect(violations).toHaveLength(1);
		expect(violations[0]).toMatchObject({
			file: "packages/@canonical/summon-component/package.json",
			field: "peerDependencies",
			from: "@canonical/summon-component",
			sibling: "@canonical/summon-core",
			range: "^0.34.0",
			actual: "0.35.0",
		});
	});

	test("bumping the range to ^0.35.0 clears it", () => {
		const fixed = structuredClone(workspace);
		// biome-ignore lint/style/noNonNullAssertion: constructed above
		fixed[0].deps.peerDependencies!["@canonical/summon-core"] = "^0.35.0";

		expect(findViolations(fixed)).toEqual([]);
	});

	test("0.35.0 really does not satisfy ^0.34.0 (the 0.x caret trap)", () => {
		// Below 1.0.0 the caret pins the MINOR, not the major. This single fact
		// is the whole bug: at ^1.34.0 the same bump would have been harmless.
		expect(satisfies("0.35.0", "^0.34.0")).toBe(false);
		expect(satisfies("1.35.0", "^1.34.0")).toBe(true);
	});
});

describe("caret semantics from 1.0.0 up", () => {
	// The 0.x trap above is one half of the caret; this is the other. Getting
	// this half wrong would make the guard reject legitimate 1.x sibling
	// ranges, and it runs inside lerna-version — a false positive here blocks
	// the release rather than letting a bad one through.
	test("^1.2.3 is >=1.2.3 <2.0.0", () => {
		expect(satisfies("1.2.3", "^1.2.3")).toBe(true);
		expect(satisfies("1.2.2", "^1.2.3")).toBe(false);
		expect(satisfies("1.99.99", "^1.2.3")).toBe(true);
		expect(satisfies("2.0.0", "^1.2.3")).toBe(false);
	});

	test("a 1.x sibling a minor ahead of its caret range is not a violation", () => {
		// The exact shape of the 5198c5399 bump, had the packages been at 1.x:
		// everything moves to 1.35.0 and the stale ^1.34.0 still admits it.
		expect(
			findViolations([
				pkg("a", "1.35.0", { peerDependencies: { b: "^1.34.0" } }),
				pkg("b", "1.35.0"),
			]),
		).toEqual([]);
	});
});

describe("field-agnosticism", () => {
	// The bump forgot peerDependencies. The next tool will forget a different
	// field, so the guard must not privilege any of them.
	for (const field of DEPENDENCY_FIELDS) {
		test(`a stale range in ${field} is caught`, () => {
			const violations = findViolations([
				pkg("a", "1.0.0", { [field]: { b: "^0.34.0" } }),
				pkg("b", "0.35.0"),
			]);

			expect(violations).toHaveLength(1);
			expect(violations[0].field).toBe(field);
		});
	}
});

describe("scope", () => {
	test("external dependencies are ignored, however stale they look", () => {
		expect(
			findViolations([pkg("a", "1.0.0", { dependencies: { typescript: "^4.0.0" } })]),
		).toEqual([]);
	});

	test("a satisfied range is not reported, whatever its form", () => {
		const workspace = [
			pkg("a", "1.0.0", {
				dependencies: {
					caret: "^0.35.0",
					tilde: "~0.35.0",
					compound: ">=0.34.0 <1.0.0",
					open: ">=0.18.0",
					exact: "0.35.0",
					star: "*",
					alternation: "^0.30.0 || ^0.35.0",
				},
			}),
			pkg("caret", "0.35.0"),
			pkg("tilde", "0.35.1"),
			pkg("compound", "0.35.0"),
			pkg("open", "0.35.0"),
			pkg("exact", "0.35.0"),
			pkg("star", "0.35.0"),
			pkg("alternation", "0.35.0"),
		];

		expect(findViolations(workspace)).toEqual([]);
	});

	test("workspace: protocol is satisfied by construction", () => {
		expect(
			findViolations([
				pkg("a", "1.0.0", { dependencies: { b: "workspace:*" } }),
				pkg("b", "0.35.0"),
			]),
		).toEqual([]);
	});

	test("but workspace: with a real range is still checked", () => {
		// `workspace:^0.34.0` carries a range that can go stale exactly like a
		// bare one, so the prefix must not be a free pass.
		const violations = findViolations([
			pkg("a", "1.0.0", { dependencies: { b: "workspace:^0.34.0" } }),
			pkg("b", "0.35.0"),
		]);

		expect(violations).toHaveLength(1);
		expect(violations[0].range).toBe("workspace:^0.34.0");
	});

	test("an exact pin that has drifted is caught", () => {
		const violations = findViolations([
			pkg("a", "1.0.0", { dependencies: { b: "0.34.0" } }),
			pkg("b", "0.35.0"),
		]);

		expect(violations).toHaveLength(1);
	});
});

describe("prerelease handling", () => {
	test("a prerelease caret does not float to a later release", () => {
		// ^0.27.1-experimental.0 is >=0.27.1-experimental.0 <0.28.0.
		expect(satisfies("0.35.0", "^0.27.1-experimental.0")).toBe(false);
		expect(satisfies("0.27.1", "^0.27.1-experimental.0")).toBe(true);
	});

	test("a prerelease sibling version only satisfies an opted-in range", () => {
		expect(satisfies("0.36.0-alpha.1", "^0.35.0")).toBe(false);
		expect(satisfies("0.35.1-alpha.1", "^0.35.1-alpha.0")).toBe(true);
	});

	test("does not false-positive on the experimental release flow", () => {
		// tag.yml defaults release_type to "experimental", and the guard now
		// gates that release before it commits. A false positive here would
		// block every pre-release, so pin the shapes lerna actually produces.
		expect(satisfies("0.36.0-experimental.0", "^0.36.0-experimental.0")).toBe(true);
		expect(satisfies("0.36.0-experimental.1", "^0.36.0-experimental.0")).toBe(true);
		expect(satisfies("0.36.0", "^0.36.0-experimental.0")).toBe(true);
		expect(satisfies("0.36.0-rc.1", "^0.36.0-rc.0")).toBe(true);
		// ...but a different pre-release line is still out of range.
		expect(satisfies("0.36.0-alpha.0", "^0.36.0-experimental.0")).toBe(false);
	});

	test("a whole-workspace experimental bump is clean", () => {
		// The shape of a `release_type: experimental` bump: every package and
		// every sibling range moves together.
		expect(
			findViolations([
				pkg("a", "0.36.0-experimental.0", {
					peerDependencies: { b: "^0.36.0-experimental.0" },
					dependencies: { c: "^0.36.0-experimental.0" },
				}),
				pkg("b", "0.36.0-experimental.0"),
				pkg("c", "0.36.0-experimental.0"),
			]),
		).toEqual([]);
	});
});

describe("failing loudly instead of silently", () => {
	test("an unmodelled range form is reported, not waved through", () => {
		// A guard that quietly passes what it cannot parse is the green-that-
		// proves-nothing this exists to prevent.
		const violations = findViolations([
			pkg("a", "1.0.0", { dependencies: { b: "1.2.3 - 2.3.4" } }),
			pkg("b", "0.35.0"),
		]);

		expect(violations).toHaveLength(1);
		expect(violations[0].unparseable).toBe(true);
	});
});

describe("against the real repository", () => {
	test("enumerates packages from the root workspace globs", async () => {
		const packages = await loadWorkspacePackages(`${import.meta.dir}/..`);

		// Guards against the enumeration silently resolving an empty set and
		// vacuously passing — the exact shape of the #901 incident.
		expect(packages.length).toBeGreaterThan(20);
		expect(packages.map((p) => p.name)).toContain("@canonical/summon-component");
		for (const p of packages) expect(p.file).not.toContain("node_modules");
	});

	test("every workspace sibling range in this tree is satisfiable", async () => {
		const packages = await loadWorkspacePackages(`${import.meta.dir}/..`);
		const violations = findViolations(packages);

		expect(
			violations.map((v) => `${v.file} ${v.field}.${v.sibling} = ${v.range} (actual ${v.actual})`),
		).toEqual([]);
	});
});

describe("repairing what a bump left behind", () => {
	test("a caret range moves to the sibling's new version", () => {
		expect(repairedRange("^0.35.0", "0.36.0")).toBe("^0.36.0");
	});

	test("a tilde range STAYS a tilde range", () => {
		// A package that pinned with `~` asked for patch-only drift. Repairing it
		// into `^` would silently widen a deliberate constraint — the fix must
		// make the range satisfiable, not make it permissive.
		expect(repairedRange("~0.35.0", "0.36.0")).toBe("~0.36.0");
	});

	test("a bare version becomes a caret range", () => {
		expect(repairedRange("0.35.0", "0.36.0")).toBe("^0.36.0");
	});

	test("a `workspace:` wrapper survives the repair", () => {
		// The protocol changes who resolves the range, not what it means.
		expect(repairedRange("workspace:^0.35.0", "0.36.0")).toBe(
			"workspace:^0.36.0",
		);
	});

	test("`workspace:*` is left alone — it links by construction", () => {
		expect(repairedRange("workspace:*", "0.36.0")).toBeNull();
	});
});

describe("rewriting a declaration in a manifest", () => {
	const manifest = [
		"{",
		'  "name": "@canonical/summon-component",',
		'  "dependencies": {',
		'    "@canonical/task": "^0.35.0"',
		"  },",
		'  "peerDependencies": {',
		'    "@canonical/summon-core": "^0.35.0",',
		'    "@canonical/task": "^0.35.0"',
		"  }",
		"}",
	].join("\n");

	test("rewrites the named field only, not the same sibling elsewhere", () => {
		// `@canonical/task` appears in BOTH blocks with the same range. A rewrite
		// that matched the first occurrence would move the wrong declaration and
		// leave the violation in place — while reporting success.
		const out = rewriteDeclaration(
			manifest,
			"peerDependencies",
			"@canonical/task",
			"^0.35.0",
			"^0.36.0",
		);
		expect(out).not.toBeNull();
		const text = out ?? "";
		expect(text).toContain('"dependencies": {\n    "@canonical/task": "^0.35.0"');
		expect(text).toContain('"@canonical/task": "^0.36.0"');
		// The sibling declared beside it is untouched.
		expect(text).toContain('"@canonical/summon-core": "^0.35.0"');
	});

	test("leaves everything else byte-identical", () => {
		const out =
			rewriteDeclaration(
				manifest,
				"peerDependencies",
				"@canonical/summon-core",
				"^0.35.0",
				"^0.36.0",
			) ?? "";
		expect(out).toBe(manifest.replace('"@canonical/summon-core": "^0.35.0"', '"@canonical/summon-core": "^0.36.0"'));
	});

	test("answers null when the declaration is not there", () => {
		expect(
			rewriteDeclaration(manifest, "peerDependencies", "@canonical/ke", "^0.35.0", "^0.36.0"),
		).toBeNull();
		expect(
			rewriteDeclaration(manifest, "optionalDependencies", "@canonical/task", "^0.35.0", "^0.36.0"),
		).toBeNull();
	});
});
