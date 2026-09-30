#!/usr/bin/env node
/**
 * Minimal, dependency-free SemVer 2.0.0 precedence helper for release scripts.
 * See https://semver.org/#spec-item-11 for the precedence rules implemented here.
 *
 * Usage:
 *   node semver.cjs gt <a> <b>   Exit 0 when a > b, exit 1 when a <= b.
 *                                Exit 2 on invalid input (treat as failure).
 *   node semver.cjs max          Read whitespace-separated versions from stdin
 *                                and print the highest one. Exit 1 when no
 *                                valid versions were provided.
 */

const SEMVER_RE =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parse(version) {
  const match = SEMVER_RE.exec(version.trim());
  if (!match) {
    return null;
  }
  return {
    main: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compareIdentifiers(a, b) {
  const aIsNumeric = /^\d+$/.test(a);
  const bIsNumeric = /^\d+$/.test(b);
  // Numeric identifiers always have lower precedence than alphanumeric ones.
  if (aIsNumeric && bIsNumeric) {
    return Math.sign(Number(a) - Number(b));
  }
  if (aIsNumeric) {
    return -1;
  }
  if (bIsNumeric) {
    return 1;
  }
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/** Returns 1 when a > b, -1 when a < b, and 0 when they have equal precedence. */
function compare(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a.main[i] !== b.main[i]) {
      return a.main[i] > b.main[i] ? 1 : -1;
    }
  }
  // A pre-release version has lower precedence than the associated normal version.
  if (a.prerelease.length === 0 && b.prerelease.length === 0) {
    return 0;
  }
  if (a.prerelease.length === 0) {
    return 1;
  }
  if (b.prerelease.length === 0) {
    return -1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i++) {
    // A larger set of pre-release fields has higher precedence, all else equal.
    if (a.prerelease[i] === undefined) {
      return -1;
    }
    if (b.prerelease[i] === undefined) {
      return 1;
    }
    const result = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (result !== 0) {
      return result;
    }
  }
  return 0;
}

function main() {
  const [mode, ...args] = process.argv.slice(2);

  if (mode === "gt") {
    const [a, b] = args;
    const parsedA = a === undefined ? null : parse(a);
    const parsedB = b === undefined ? null : parse(b);
    if (!parsedA || !parsedB) {
      console.error(`semver.cjs gt: invalid version(s): "${a}" "${b}"`);
      process.exit(2);
    }
    process.exit(compare(parsedA, parsedB) === 1 ? 0 : 1);
  }

  if (mode === "max") {
    const input = require("node:fs").readFileSync(0, "utf8");
    let maxRaw = null;
    let maxParsed = null;
    for (const raw of input.split(/\s+/)) {
      if (!raw) {
        continue;
      }
      const parsed = parse(raw);
      if (!parsed) {
        console.error(`semver.cjs max: skipping invalid version "${raw}"`);
        continue;
      }
      if (maxParsed === null || compare(parsed, maxParsed) === 1) {
        maxRaw = raw;
        maxParsed = parsed;
      }
    }
    if (maxRaw === null) {
      process.exit(1);
    }
    console.log(maxRaw);
    process.exit(0);
  }

  console.error("Usage: semver.cjs gt <a> <b> | semver.cjs max");
  process.exit(2);
}

main();
