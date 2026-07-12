import type {
  AvailableImplementation,
  LedgerEntry,
  LedgerPrefix,
} from "./types.js";

/** Escape a string for use inside a double-quoted Turtle literal */
export function escapeLiteral(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/** Reverse of {@link escapeLiteral} */
export function unescapeLiteral(value: string): string {
  return value
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Slug used in entry subject URIs: npm scope is stripped (matching the
 * convention of `data/implementations.ttl`) and each run of characters
 * outside [a-z0-9] — including "." — is folded to a single "-". This keeps
 * the package slug free of dots, the separator used between the segments of
 * {@link entrySubjectLocalName}. Changing this mapping would change the
 * subjects of entries already recorded in the append-only ledger, so it must
 * stay stable.
 */
export function slugifyPackageName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^@[^/]+\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Version slug for subject URIs (semver is already URI-safe except "+") */
export function slugifyVersion(version: string): string {
  return version.replace(/[^a-zA-Z0-9.-]+/g, "-");
}

/** Subject local name for an entry, e.g. "implementation.version.react-ds-global.0.29.1" */
export function entrySubjectLocalName(entry: {
  packageName: string;
  packageVersion: string;
}): string {
  return `implementation.version.${slugifyPackageName(entry.packageName)}.${slugifyVersion(entry.packageVersion)}`;
}

function serializeImplementation(
  impl: AvailableImplementation,
  p: string,
): string {
  const lines = [
    `        a ${p}:AvailableImplementation;`,
    `        ${p}:implementsBlock ${impl.blockUri};`,
    `        ${p}:blockVersion "${escapeLiteral(impl.blockVersion)}";`,
  ];
  if (impl.exportedSymbol !== undefined) {
    lines.push(
      `        ${p}:exportedSymbol "${escapeLiteral(impl.exportedSymbol)}";`,
    );
  }
  if (impl.importStatement !== undefined) {
    lines.push(
      `        ${p}:importStatement "${escapeLiteral(impl.importStatement)}";`,
    );
  }
  lines.push(`        ${p}:importVerified ${impl.importVerified}`);
  if (impl.isDraft) {
    lines[lines.length - 1] += ";";
    lines.push(`        ${p}:isDraft true`);
  }
  return lines.join("\n");
}

/**
 * Serialize the Turtle stanza for one ledger entry (without its comment
 * header). The output is fully deterministic for a given entry, which is what
 * makes recorded-vs-computed content comparison possible.
 */
export function serializeEntryBody(
  entry: LedgerEntry,
  prefix: LedgerPrefix,
): string {
  const p = prefix.short;
  const implementations = [...entry.implementations].sort((a, b) =>
    a.blockUri.localeCompare(b.blockUri),
  );

  const blocks = implementations
    .map((impl) => serializeImplementation(impl, p))
    .join("\n    ], [\n");

  return [
    `${p}:${entrySubjectLocalName(entry)}`,
    `    a ${p}:ImplementationVersion;`,
    `    ${p}:package "${escapeLiteral(entry.packageName)}";`,
    `    ${p}:packageVersion "${escapeLiteral(entry.packageVersion)}";`,
    `    ${p}:makesAvailable [`,
    blocks,
    `    ].`,
  ].join("\n");
}

/**
 * Serialize a complete ledger entry: human-scannable comment header followed
 * by the Turtle stanza.
 *
 * @param recordedAt - Optional provenance line content (derived from git so
 *   the output stays reproducible; e.g. "git cdc725d (2026-07-08)").
 */
export function serializeEntry(
  entry: LedgerEntry,
  prefix: LedgerPrefix,
  recordedAt?: string,
): string {
  const header = [
    `# ---- ${entry.packageName}@${entry.packageVersion} ----`,
    ...(recordedAt ? [`# recorded: ${recordedAt}`] : []),
  ];
  return `${header.join("\n")}\n${serializeEntryBody(entry, prefix)}\n`;
}

/**
 * Preamble written once, when the ledger file is first created.
 * Existing ledgers are never rewritten, so this only ever appears at the top
 * of a brand-new file.
 */
export function serializePreamble(prefix: LedgerPrefix): string {
  return [
    "# Pragma implementation-version ledger",
    "#",
    "# APPEND-ONLY: this file grows like a changelog. Existing entries are",
    "# never modified, reordered, or deleted; new entries are appended by",
    "# @canonical/implementation-ledger (packages/implementation-ledger).",
    "#",
    "# Each entry records what one published (npm package, version) pair makes",
    "# available: the implemented design system blocks, each block's version,",
    "# and the import statement a consumer would use.",
    "",
    "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.",
    "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.",
    "@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.",
    `@prefix ${prefix.short}: <${prefix.namespace}>.`,
    "",
  ].join("\n");
}
