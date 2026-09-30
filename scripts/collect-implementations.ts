#!/usr/bin/env bun
/**
 * Monorepo-aware implementation collector
 *
 * Discovers packages with design system configurations and collects
 * @implements annotations from source files, generating RDF metadata.
 *
 * Usage:
 *   bun scripts/collect-implementations.ts              # Process all packages
 *   bun scripts/collect-implementations.ts --package X  # Process specific package
 *   bun scripts/collect-implementations.ts --help       # Show help
 */

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname, relative, resolve } from "node:path";
import { glob } from "tinyglobby";

import {
	scanAnnotations,
	generateLibraryTurtle,
	generateObjectsTurtle,
} from "@canonical/design-system/src/collect/index.js";
import type { CollectConfig } from "@canonical/design-system/src/collect/types.js";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface RootConfig {
	prefix: {
		short: string;
		namespace: string;
	};
	repository: string;
	documentationBase?: string;
	defaults: {
		outputDir: string;
		patterns: Record<string, string>;
	};
}

interface PackageConfig {
	platform: string;
	tier?: string;
	pattern?: string;
	outputDir?: string;
	documentation?: string;
	name?: string;
	description?: string;
	link?: string;
}

interface DiscoveredPackage {
	path: string;
	relativePath: string;
	config: PackageConfig;
	packageJson: {
		name: string;
		description?: string;
	};
}

// -------------------------------------------------------------------
// Config Loading
// -------------------------------------------------------------------

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function loadRootConfig(rootDir: string): Promise<RootConfig> {
	const configPath = join(rootDir, "ds.config.json");

	if (!await fileExists(configPath)) {
		throw new Error(`Root config not found: ${configPath}`);
	}

	const content = await readFile(configPath, "utf-8");
	return JSON.parse(content);
}

async function loadPackageJson(pkgDir: string): Promise<{ name: string; description?: string }> {
	const pkgPath = join(pkgDir, "package.json");
	const content = await readFile(pkgPath, "utf-8");
	const pkg = JSON.parse(content);
	return { name: pkg.name, description: pkg.description };
}

/**
 * Load package-level DS config from design-system.json
 */
async function loadPackageConfig(pkgDir: string): Promise<PackageConfig | null> {
	const configPath = join(pkgDir, "design-system.json");
	if (await fileExists(configPath)) {
		const content = await readFile(configPath, "utf-8");
		const config = JSON.parse(content);
		return {
			platform: config.platform,
			tier: config.tier,
			pattern: config.pattern,
			outputDir: config.outputDir,
			documentation: config.documentation,
			name: config.name,
			description: config.description,
			link: config.link,
		};
	}

	return null;
}

// -------------------------------------------------------------------
// Package Discovery
// -------------------------------------------------------------------

async function getWorkspaces(rootDir: string): Promise<string[]> {
	const pkgPath = join(rootDir, "package.json");
	const content = await readFile(pkgPath, "utf-8");
	const pkg = JSON.parse(content);

	const workspacePatterns: string[] = pkg.workspaces || [];
	const allDirs: string[] = [];

	for (const pattern of workspacePatterns) {
		const dirs = await glob(pattern, {
			cwd: rootDir,
			onlyDirectories: true,
			absolute: true
		});
		allDirs.push(...dirs);
	}

	return allDirs;
}

async function discoverPackages(rootDir: string): Promise<DiscoveredPackage[]> {
	const workspaceDirs = await getWorkspaces(rootDir);
	const discovered: DiscoveredPackage[] = [];

	for (const dir of workspaceDirs) {
		const config = await loadPackageConfig(dir);
		if (config) {
			const packageJson = await loadPackageJson(dir);
			discovered.push({
				path: dir,
				relativePath: relative(rootDir, dir),
				config,
				packageJson,
			});
		}
	}

	return discovered;
}

// -------------------------------------------------------------------
// Config Merging
// -------------------------------------------------------------------

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/^@[^/]+\//, "") // Remove npm scope
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function mergeConfigs(
	root: RootConfig,
	pkg: DiscoveredPackage,
	version?: string,
): CollectConfig {
	const { config, packageJson, relativePath } = pkg;

	// Derive values from conventions
	const name = config.name || packageJson.name;
	const description = config.description || packageJson.description;
	const pattern = config.pattern || root.defaults.patterns[config.platform] || "src/**/*.ts";
	const outputDir = config.outputDir || root.defaults.outputDir;
	const link = config.link || `${root.repository}/tree/main/${relativePath}`;
	const documentation = config.documentation ||
		(root.documentationBase ? `${root.documentationBase}/${config.platform}` : undefined);

	return {
		name,
		platform: config.platform,
		description,
		link,
		documentation,
		tier: config.tier,
		prefix: root.prefix,
		pattern,
		outputDir,
		version,
		repository: root.repository,
		sourcePath: relativePath,
	};
}

// -------------------------------------------------------------------
// Collection
// -------------------------------------------------------------------

interface CollectResult {
	packagePath: string;
	libraryName: string;
	librarySlug: string;
	annotationCount: number;
	outputPath: string;
}

interface CollectOptions {
	centralized?: boolean;
	rootDir?: string;
	/** Base output directory for centralized mode (default: {rootDir}/data) */
	outDir?: string;
}

async function collectPackage(
	pkg: DiscoveredPackage,
	config: CollectConfig,
	options: CollectOptions = {},
): Promise<CollectResult> {
	const cwd = pkg.path;
	const librarySlug = slugify(config.name);

	// Scan for annotations
	const annotations = await scanAnnotations(config.pattern, cwd);

	// Filter to valid prefix
	const validAnnotations = annotations.filter(
		ann => ann.prefix === config.prefix.short
	);

	// Determine output directory
	let outputDir: string;
	let outputPath: string;

	if (options.centralized && options.rootDir) {
		// Centralized: all output to {outDir}/{librarySlug}/
		const baseDir = options.outDir || join(options.rootDir, "data");
		outputDir = join(baseDir, librarySlug);
		outputPath = relative(options.rootDir, outputDir);
	} else {
		// Distributed: output to each package's data/
		outputDir = join(cwd, config.outputDir || "data");
		outputPath = `${pkg.relativePath}/${config.outputDir || "data"}`;
	}

	await mkdir(outputDir, { recursive: true });

	// Generate library TTL
	const libraryTtl = await generateLibraryTurtle(config);
	const libraryPath = join(outputDir, "implementationLibrary.ttl");
	await writeFile(libraryPath, libraryTtl, "utf-8");

	// Generate objects TTL if we have annotations
	if (validAnnotations.length > 0) {
		const objectsTtl = await generateObjectsTurtle(config, validAnnotations, cwd);
		if (objectsTtl) {
			const objectsPath = join(outputDir, "implementationObjects.ttl");
			await writeFile(objectsPath, objectsTtl, "utf-8");
		}
	}

	return {
		packagePath: pkg.relativePath,
		libraryName: config.name,
		librarySlug,
		annotationCount: validAnnotations.length,
		outputPath,
	};
}

// -------------------------------------------------------------------
// Aggregation
// -------------------------------------------------------------------

async function generateAggregateIndex(
	outDir: string,
	rootConfig: RootConfig,
	results: CollectResult[],
): Promise<void> {
	const p = rootConfig.prefix.short;
	const ns = rootConfig.prefix.namespace;

	const lines = [
		`@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.`,
		`@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.`,
		`@prefix ${p}: <${ns}>.`,
		``,
		`# Pragma Design System Implementation Index`,
		`# Auto-generated by collect-implementations`,
		``,
	];

	// Sort for deterministic output so regenerated files diff cleanly
	const sorted = [...results].sort((a, b) =>
		a.librarySlug.localeCompare(b.librarySlug),
	);

	for (const result of sorted) {
		// seeAlso must be an absolute IRI: the graph loads this file without a
		// base IRI, and Turtle parsers reject relative IRIs in that case.
		const seeAlso = `${rootConfig.repository}/blob/main/data/${result.librarySlug}/implementationLibrary.ttl`;
		lines.push(`${p}:implementation.library.${result.librarySlug}`);
		lines.push(`    a ${p}:ImplementationLibrary;`);
		lines.push(`    rdfs:seeAlso <${seeAlso}>;`);
		lines.push(`    ${p}:implementationCount ${result.annotationCount}.`);
		lines.push(``);
	}

	await mkdir(outDir, { recursive: true });

	const indexPath = join(outDir, "implementations.ttl");
	await writeFile(indexPath, lines.join("\n"), "utf-8");
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.includes("--help") || args.includes("-h")) {
		console.log(`
Usage: bun scripts/collect-implementations.ts [options]

Options:
  --package <path>   Process only the specified package
  --version <v>      Release version stamped as ds:version / ds:versionedLink
                     (default: the current version from lerna.json)
  --out <dir>        Base output directory for centralized mode (default: data/)
  --distributed      Output data to each package's data/ folder (default: centralized)
  --no-aggregate     Skip generating aggregate index
  --help, -h         Show this help message

By default, all output goes to the monorepo root data/ folder (centralized mode).
Use --distributed to output to each package's own data/ folder instead.

Examples:
  bun scripts/collect-implementations.ts
  bun scripts/collect-implementations.ts --version 0.35.0
  bun scripts/collect-implementations.ts --package packages/ds-types
  bun scripts/collect-implementations.ts --distributed
`);
		process.exit(0);
	}

	// Find monorepo root (where ds.config.json is)
	let rootDir = process.cwd();
	while (!await fileExists(join(rootDir, "ds.config.json"))) {
		const parent = dirname(rootDir);
		if (parent === rootDir) {
			throw new Error("Could not find ds.config.json in any parent directory");
		}
		rootDir = parent;
	}

	console.log(`Monorepo root: ${rootDir}`);

	// Load root config
	const rootConfig = await loadRootConfig(rootDir);
	console.log(`Prefix: ${rootConfig.prefix.short}: <${rootConfig.prefix.namespace}>`);

	// Parse args
	const packageArg = args.indexOf("--package");
	const specificPackage = packageArg !== -1 ? args[packageArg + 1] : null;
	const versionArg = args.indexOf("--version");
	const outArg = args.indexOf("--out");
	const outDir = outArg !== -1 ? resolve(args[outArg + 1]) : join(rootDir, "data");
	const skipAggregate = args.includes("--no-aggregate");
	const distributed = args.includes("--distributed");
	const centralized = !distributed; // Centralized is now the default

	// Release version: explicit flag, else the current version from lerna.json.
	// Stamped as ds:version on each library and used to build versionedLink
	// blob URLs pinned to the release tag.
	let version: string | undefined;
	if (versionArg !== -1) {
		version = args[versionArg + 1];
	} else {
		const lernaPath = join(rootDir, "lerna.json");
		if (await fileExists(lernaPath)) {
			version = JSON.parse(await readFile(lernaPath, "utf-8")).version;
		}
	}
	if (version) {
		console.log(`Release version: ${version}`);
	}

	if (centralized) {
		console.log("Mode: centralized (all output to root data/)");
	} else {
		console.log("Mode: distributed (output to each package's data/)");
	}

	// Discover packages
	let packages = await discoverPackages(rootDir);
	console.log(`\nDiscovered ${packages.length} package(s) with DS config`);

	// Filter to specific package if requested
	if (specificPackage) {
		packages = packages.filter(p =>
			p.relativePath === specificPackage ||
			p.relativePath.endsWith(specificPackage)
		);
		if (packages.length === 0) {
			console.error(`No matching package found: ${specificPackage}`);
			process.exit(1);
		}
	}

	// Process each package
	const results: CollectResult[] = [];
	const collectOptions: CollectOptions = {
		centralized,
		rootDir,
		outDir,
	};

	for (const pkg of packages) {
		console.log(`\n--- ${pkg.relativePath} ---`);

		const config = mergeConfigs(rootConfig, pkg, version);
		console.log(`  Platform: ${config.platform}`);
		console.log(`  Pattern: ${config.pattern}`);

		const result = await collectPackage(pkg, config, collectOptions);
		results.push(result);

		console.log(`  Found ${result.annotationCount} implementation(s)`);
		console.log(`  Written: ${result.outputPath}/`);
	}

	// Generate aggregate index
	if (!skipAggregate && results.length > 0) {
		console.log(`\n--- Aggregate Index ---`);
		await generateAggregateIndex(outDir, rootConfig, results);
		console.log(`  Written: ${relative(rootDir, join(outDir, "implementations.ttl"))}`);
	}

	console.log(`\nDone! Processed ${results.length} package(s)`);
}

main().catch((err) => {
	console.error("Error:", err.message);
	process.exit(1);
});
