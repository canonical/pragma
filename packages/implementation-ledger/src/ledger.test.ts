import { describe, expect, it } from "vitest";
import { appendEntries, describeMismatch, entriesEqual } from "./ledger.js";
import { LedgerParseError, parseLedger } from "./parseLedger.js";
import {
  entrySubjectLocalName,
  serializeEntry,
  serializePreamble,
} from "./serializeLedger.js";
import type { LedgerEntry, LedgerPrefix } from "./types.js";

const prefix: LedgerPrefix = {
  short: "ds",
  namespace: "https://ds.canonical.com/",
};

const button = {
  blockUri: "ds:global.component.button",
  blockVersion: "3.1.0",
  exportedSymbol: "Button",
  importStatement: 'import { Button } from "@canonical/react-ds-global";',
  importVerified: true,
  isDraft: false,
};

const contextualMenu = {
  blockUri: "ds:global.component.contextual_menu",
  blockVersion: "4.2.0",
  exportedSymbol: "ContextualMenu",
  importStatement:
    'import { ContextualMenu } from "@canonical/react-ds-global";',
  importVerified: false,
  isDraft: true,
};

const entry: LedgerEntry = {
  packageName: "@canonical/react-ds-global",
  packageVersion: "3.1.0",
  implementations: [button, contextualMenu],
};

const otherEntry: LedgerEntry = {
  packageName: "@canonical/ds-types",
  packageVersion: "0.29.0",
  implementations: [
    {
      blockUri: "ds:global.modifier_family.severity",
      blockVersion: "0.29.0",
      exportedSymbol: "MODIFIER_FAMILIES",
      importStatement:
        'import { MODIFIER_FAMILIES } from "@canonical/ds-types";',
      importVerified: true,
      isDraft: false,
    },
  ],
};

describe("serialize/parse roundtrip", () => {
  it("roundtrips entries through the Turtle serialization", () => {
    const content =
      serializePreamble(prefix) +
      serializeEntry(entry, prefix, "git abc1234 (2026-07-08)") +
      "\n" +
      serializeEntry(otherEntry, prefix);

    const parsed = parseLedger(content, prefix);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(entry);
    expect(parsed[1]).toEqual(otherEntry);
  });

  it("parses CRLF line endings (e.g. git autocrlf checkouts)", () => {
    const content =
      serializePreamble(prefix) +
      serializeEntry(entry, prefix, "git abc1234 (2026-07-08)") +
      "\n" +
      serializeEntry(otherEntry, prefix);

    const parsed = parseLedger(content.replace(/\n/g, "\r\n"), prefix);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(entry);
    expect(parsed[1]).toEqual(otherEntry);
  });

  it("escapes and unescapes quotes in literals", () => {
    const parsed = parseLedger(
      serializePreamble(prefix) + serializeEntry(entry, prefix),
      prefix,
    );
    expect(parsed[0].implementations[0].importStatement).toBe(
      'import { Button } from "@canonical/react-ds-global";',
    );
  });

  it("derives a stable subject local name", () => {
    expect(entrySubjectLocalName(entry)).toBe(
      "implementation.version.react-ds-global.3.1.0",
    );
  });

  it("rejects hand-edited stanzas", () => {
    const content = (
      serializePreamble(prefix) + serializeEntry(entry, prefix)
    ).replace("ds:packageVersion", "ds:somethingElse");
    expect(() => parseLedger(content, prefix)).toThrow(LedgerParseError);
  });

  it("rejects a tampered subject URI", () => {
    const content = (
      serializePreamble(prefix) + serializeEntry(entry, prefix)
    ).replace(
      "implementation.version.react-ds-global.3.1.0",
      "implementation.version.react-ds-global.9.9.9",
    );
    expect(() => parseLedger(content, prefix)).toThrow(LedgerParseError);
  });

  it("rejects a mismatched prefix namespace", () => {
    const content =
      serializePreamble({ short: "ds", namespace: "https://evil.example/" }) +
      serializeEntry(entry, prefix);
    expect(() => parseLedger(content, prefix)).toThrow(/prefix ds: is bound/);
  });
});

describe("appendEntries", () => {
  it("creates a new ledger with a preamble and the entries", () => {
    const result = appendEntries(undefined, [entry], { prefix });

    expect(result.appended).toEqual([entry]);
    expect(result.skipped).toEqual([]);
    expect(result.mismatches).toEqual([]);
    expect(result.content).toContain("APPEND-ONLY");
    expect(parseLedger(result.content, prefix)).toEqual([entry]);
  });

  it("is idempotent: identical re-collect skips silently and changes nothing", () => {
    const first = appendEntries(undefined, [entry, otherEntry], { prefix });
    const second = appendEntries(first.content, [entry, otherEntry], {
      prefix,
    });

    expect(second.appended).toEqual([]);
    expect(second.skipped).toHaveLength(2);
    expect(second.mismatches).toEqual([]);
    expect(second.content).toBe(first.content);
  });

  it("appends without touching existing bytes", () => {
    const first = appendEntries(undefined, [entry], { prefix });
    const second = appendEntries(first.content, [otherEntry], {
      prefix,
      recordedAt: "git abc1234 (2026-07-08)",
    });

    expect(second.content.startsWith(first.content)).toBe(true);
    expect(second.appended).toEqual([otherEntry]);
    expect(parseLedger(second.content, prefix)).toEqual([entry, otherEntry]);
  });

  it("reports a mismatch when a recorded (package, version) differs", () => {
    const first = appendEntries(undefined, [entry], { prefix });
    const changed: LedgerEntry = {
      ...entry,
      implementations: [{ ...button, blockVersion: "9.9.9" }],
    };

    const result = appendEntries(first.content, [changed], { prefix });

    expect(result.appended).toEqual([]);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0].key).toBe("@canonical/react-ds-global@3.1.0");
    expect(describeMismatch(result.mismatches[0], prefix)).toContain(
      "integrity violation",
    );
    // Existing content is never modified, even on mismatch.
    expect(result.content).toBe(first.content);
  });

  it("fails loudly on a corrupted ledger instead of rewriting it", () => {
    const first = appendEntries(undefined, [entry], { prefix });
    const corrupted = first.content.replace(
      'ds:packageVersion "3.1.0";',
      'ds:packageVersion "3.1.0" .',
    );
    expect(() => appendEntries(corrupted, [otherEntry], { prefix })).toThrow(
      LedgerParseError,
    );
  });

  it("treats implementation order as irrelevant (sorted serialization)", () => {
    const reordered: LedgerEntry = {
      ...entry,
      implementations: [contextualMenu, button],
    };
    expect(entriesEqual(entry, reordered, prefix)).toBe(true);

    const first = appendEntries(undefined, [entry], { prefix });
    const second = appendEntries(first.content, [reordered], { prefix });
    expect(second.mismatches).toEqual([]);
    expect(second.skipped).toHaveLength(1);
  });

  it("records provenance headers when provided", () => {
    const result = appendEntries(undefined, [entry], {
      prefix,
      recordedAt: "git abc1234 (2026-07-08)",
    });
    expect(result.content).toContain(
      "# ---- @canonical/react-ds-global@3.1.0 ----",
    );
    expect(result.content).toContain("# recorded: git abc1234 (2026-07-08)");
  });
});
