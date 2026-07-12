#!/usr/bin/env bun
/**
 * Append-only implementation-version ledger collector.
 *
 * Records, for each annotated (npm package, version) pair, which design
 * system blocks it makes available and how to import them. Entries are only
 * ever appended to data/implementation-versions.ttl — never rewritten.
 *
 * Usage:
 *   implementation-ledger collect                  # all annotated packages
 *   implementation-ledger collect --package .      # only the cwd's package
 *   implementation-ledger collect --dry-run        # report without writing
 *
 * Exit codes:
 *   0 - entries appended and/or already recorded (idempotent no-op)
 *   1 - integrity violation (recorded entry differs), parse failure, or usage error
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  computeEntryForPackage,
  discoverAnnotatedPackages,
  findRootDir,
  loadRootConfig,
} from "./computeEntries.js";
import { withFileLock } from "./fileLock.js";
import { gitProvenance } from "./gitProvenance.js";
import { appendEntries, describeMismatch, entryKey } from "./ledger.js";
import { type CliOptions, HELP, parseArgs, UsageError } from "./parseArgs.js";
import type { LedgerEntry } from "./types.js";

/** Thrown after mismatch details have been printed; carries only a summary. */
class IntegrityViolationError extends Error {}

async function main(): Promise<void> {
  let options: CliOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      console.error(HELP);
      process.exit(1);
    }
    throw error;
  }
  if (options.help) {
    console.log(HELP);
    return;
  }

  const rootDir = await findRootDir(process.cwd());
  const rootConfig = await loadRootConfig(rootDir);
  const ledgerPath = options.ledgerPath
    ? resolve(options.ledgerPath)
    : join(rootDir, "data", "implementation-versions.ttl");

  let packages = await discoverAnnotatedPackages(rootDir);
  if (options.packageFilter !== undefined) {
    const target = resolve(options.packageFilter);
    packages = packages.filter((pkg) => pkg.path === target);
    if (packages.length === 0) {
      // A package without a design-system.json has nothing to record; this
      // must stay a silent no-op so the ledger can be wired into the build
      // of every storybook-bearing package, annotated or not.
      if (!options.quiet) {
        console.log(
          `ledger: ${options.packageFilter} has no design-system.json — nothing to record`,
        );
      }
      return;
    }
  }

  const entries: LedgerEntry[] = [];
  const warnings: string[] = [];
  for (const pkg of packages) {
    const computed = await computeEntryForPackage(pkg, rootConfig);
    if (computed) {
      entries.push(computed.entry);
      warnings.push(...computed.warnings);
    } else if (!options.quiet) {
      console.log(`ledger: ${pkg.packageName} has no annotations — skipping`);
    }
  }

  for (const warning of warnings) {
    console.warn(`warning: ${warning}`);
  }

  if (entries.length === 0) {
    if (!options.quiet) {
      console.log("ledger: no annotated packages found — nothing to record");
    }
    return;
  }

  await withFileLock(ledgerPath, async () => {
    let existing: string | undefined;
    try {
      existing = await readFile(ledgerPath, "utf-8");
    } catch {
      existing = undefined;
    }

    const result = appendEntries(existing, entries, {
      prefix: rootConfig.prefix,
      recordedAt: gitProvenance(rootDir),
    });

    if (result.mismatches.length > 0) {
      for (const mismatch of result.mismatches) {
        const description = describeMismatch(mismatch, rootConfig.prefix);
        if (options.tolerateDrift) {
          console.warn(`warning (tolerated): ${description}`);
        } else {
          console.error(description);
        }
      }
      if (!options.tolerateDrift) {
        // Integrity violation: fail loudly and write nothing at all.
        // (Thrown, not process.exit(), so the ledger lock is released.)
        throw new IntegrityViolationError(
          `${result.mismatches.length} recorded entry(ies) differ from current sources`,
        );
      }
    }

    if (!options.quiet) {
      for (const entry of result.skipped) {
        console.log(`ledger: ${entryKey(entry)} already recorded — skipping`);
      }
    }
    for (const entry of result.appended) {
      console.log(
        `ledger: recorded ${entryKey(entry)} (${entry.implementations.length} block(s))`,
      );
    }

    if (result.appended.length === 0) {
      if (!options.quiet) {
        console.log(`ledger: no changes (${ledgerPath})`);
      }
      return;
    }

    if (options.dryRun) {
      console.log("ledger: dry run — nothing written");
      return;
    }

    await writeFile(ledgerPath, result.content, "utf-8");
    console.log(
      `ledger: appended ${result.appended.length} entry(ies) to ${ledgerPath}`,
    );
  });
}

main().catch((error) => {
  console.error(`error: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
