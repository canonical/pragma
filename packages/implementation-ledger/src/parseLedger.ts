import { entrySubjectLocalName, unescapeLiteral } from "./serializeLedger.js";
import type {
  AvailableImplementation,
  LedgerEntry,
  LedgerPrefix,
} from "./types.js";

/**
 * Error thrown when the ledger file cannot be parsed. Since the ledger is
 * only ever written by this tool, a parse failure means the file was
 * hand-edited or corrupted — an integrity problem that must fail loudly, not
 * be papered over.
 */
export class LedgerParseError extends Error {
  constructor(message: string) {
    super(
      `implementation-version ledger is corrupt or was hand-edited: ${message}`,
    );
    this.name = "LedgerParseError";
  }
}

interface LineCursor {
  lines: string[];
  index: number;
}

function peek(cursor: LineCursor): string | undefined {
  return cursor.lines[cursor.index];
}

function next(cursor: LineCursor): string {
  const line = cursor.lines[cursor.index];
  if (line === undefined) {
    throw new LedgerParseError("unexpected end of file");
  }
  cursor.index += 1;
  return line;
}

function expectMatch(
  cursor: LineCursor,
  pattern: RegExp,
  what: string,
): RegExpExecArray {
  const line = next(cursor);
  const match = pattern.exec(line);
  if (!match) {
    throw new LedgerParseError(
      `expected ${what} at line ${cursor.index}, found: ${JSON.stringify(line)}`,
    );
  }
  return match;
}

const LITERAL = '"((?:[^"\\\\]|\\\\.)*)"';

function parseImplementation(
  cursor: LineCursor,
  p: string,
): { impl: AvailableImplementation; terminator: string } {
  expectMatch(
    cursor,
    new RegExp(`^ {8}a ${p}:AvailableImplementation;$`),
    `"a ${p}:AvailableImplementation;"`,
  );
  const blockMatch = expectMatch(
    cursor,
    new RegExp(`^ {8}${p}:implementsBlock (\\S+);$`),
    `${p}:implementsBlock`,
  );
  const versionMatch = expectMatch(
    cursor,
    new RegExp(`^ {8}${p}:blockVersion ${LITERAL};$`),
    `${p}:blockVersion`,
  );

  const impl: AvailableImplementation = {
    blockUri: blockMatch[1],
    blockVersion: unescapeLiteral(versionMatch[1]),
    importVerified: false,
    isDraft: false,
  };

  let line = peek(cursor);
  let symbolMatch =
    line === undefined
      ? null
      : new RegExp(`^ {8}${p}:exportedSymbol ${LITERAL};$`).exec(line);
  if (symbolMatch) {
    impl.exportedSymbol = unescapeLiteral(symbolMatch[1]);
    next(cursor);
    line = peek(cursor);
  }
  symbolMatch =
    line === undefined
      ? null
      : new RegExp(`^ {8}${p}:importStatement ${LITERAL};$`).exec(line);
  if (symbolMatch) {
    impl.importStatement = unescapeLiteral(symbolMatch[1]);
    next(cursor);
  }

  const verifiedMatch = expectMatch(
    cursor,
    new RegExp(`^ {8}${p}:importVerified (true|false)(;?)$`),
    `${p}:importVerified`,
  );
  impl.importVerified = verifiedMatch[1] === "true";

  if (verifiedMatch[2] === ";") {
    expectMatch(cursor, new RegExp(`^ {8}${p}:isDraft true$`), `${p}:isDraft`);
    impl.isDraft = true;
  }

  const terminator = expectMatch(
    cursor,
    /^ {4}(\], \[|\]\.)$/,
    '"], [" or "]."',
  )[1];

  return { impl, terminator };
}

function parseEntry(cursor: LineCursor, p: string): LedgerEntry {
  const subject = expectMatch(
    cursor,
    new RegExp(`^${p}:(implementation\\.version\\.\\S+)$`),
    "entry subject",
  )[1];

  expectMatch(
    cursor,
    new RegExp(`^ {4}a ${p}:ImplementationVersion;$`),
    `"a ${p}:ImplementationVersion;"`,
  );
  const packageName = unescapeLiteral(
    expectMatch(
      cursor,
      new RegExp(`^ {4}${p}:package ${LITERAL};$`),
      `${p}:package`,
    )[1],
  );
  const packageVersion = unescapeLiteral(
    expectMatch(
      cursor,
      new RegExp(`^ {4}${p}:packageVersion ${LITERAL};$`),
      `${p}:packageVersion`,
    )[1],
  );
  expectMatch(
    cursor,
    new RegExp(`^ {4}${p}:makesAvailable \\[$`),
    `${p}:makesAvailable [`,
  );

  const implementations: AvailableImplementation[] = [];
  let terminator = "], [";
  while (terminator === "], [") {
    const parsed = parseImplementation(cursor, p);
    implementations.push(parsed.impl);
    terminator = parsed.terminator;
  }

  const entry: LedgerEntry = { packageName, packageVersion, implementations };

  const expectedSubject = entrySubjectLocalName(entry);
  if (subject !== expectedSubject) {
    throw new LedgerParseError(
      `entry subject "${subject}" does not match its package/version ` +
        `(expected "${expectedSubject}")`,
    );
  }

  return entry;
}

/**
 * Parse a ledger file previously written by this tool.
 *
 * The parser is deliberately strict: it accepts exactly the grammar the
 * serializer emits (plus comments and blank lines between stanzas). Anything
 * else throws a {@link LedgerParseError}, which doubles as tamper detection
 * for an append-only artifact.
 */
export function parseLedger(
  content: string,
  prefix: LedgerPrefix,
): LedgerEntry[] {
  const p = prefix.short;
  const cursor: LineCursor = {
    // Split on \r?\n so CRLF checkouts (e.g. git autocrlf on Windows) don't
    // leave a trailing \r that breaks the strict ^...$ line matches. Literal
    // CRs inside values are escaped as \r by the serializer, so a raw \r can
    // only ever be a line ending.
    lines: content.split(/\r?\n/),
    index: 0,
  };

  const prefixDeclarations = new Map<string, string>();
  const entries: LedgerEntry[] = [];

  while (cursor.index < cursor.lines.length) {
    const line = peek(cursor);
    if (line === undefined) {
      break;
    }
    if (line.trim() === "" || line.startsWith("#")) {
      next(cursor);
      continue;
    }
    const prefixMatch = /^@prefix\s+([A-Za-z][\w-]*):\s+<([^>]*)>\s*\.$/.exec(
      line,
    );
    if (prefixMatch) {
      prefixDeclarations.set(prefixMatch[1], prefixMatch[2]);
      next(cursor);
      continue;
    }
    entries.push(parseEntry(cursor, p));
  }

  const declaredNamespace = prefixDeclarations.get(p);
  if (declaredNamespace === undefined) {
    throw new LedgerParseError(`missing "@prefix ${p}:" declaration`);
  }
  if (declaredNamespace !== prefix.namespace) {
    throw new LedgerParseError(
      `prefix ${p}: is bound to <${declaredNamespace}>, expected <${prefix.namespace}>`,
    );
  }

  return entries;
}
