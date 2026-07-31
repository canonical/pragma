/**
 * The kernel is generic machinery: it may describe itself, but it may not name
 * the distribution in an authored string. A fork changes `pragma.conf.ts`;
 * anything the kernel hardcodes becomes a lie it cannot fix.
 *
 * What this guard enforces, exactly: no string literal under `src/kernel/**`
 * (plus `constants.ts` and `bin.ts`) contains the distribution's `name` as a
 * word, the domain phrase "design system", or any namespace IRI the
 * distribution declares in `prefixes`. Module specifiers are not copy and are
 * skipped; every remaining site that legitimately carries one is listed in
 * {@link EXEMPT} with its reason and the PR that removes it.
 *
 * `src/capabilities/**` and `pragma.conf.ts` are OUT of the rule above.
 * `pragma.conf.ts` is the file a fork edits, so it is content by definition;
 * `src/capabilities/**` still carries the hand-written `ds:` residue
 * (`block list`, `token add-config`, `tier lookup`) plus runtime copy no doc
 * publishes, and a guard needing a 65-entry exemption list is a guard that
 * mostly exempts. One narrower rule reaches it instead, at the bottom of this
 * file: {@link COMMAND_POSITIONS} — *a command a user is told to run is never a
 * literal*. Zero exemptions, and it reads raw source rather than {@link
 * readCopy}, so it holds whatever the scanner can or cannot see.
 *
 * NOTE for a reader of an older revision: this docblock used to say the
 * `examples[].cmd` sweep and the `docs/reference/*.md` regen "have to move
 * together". They must be CONSISTENT, not simultaneous — the whole sweep was
 * measured to move zero doc bytes, because every literal it replaced was
 * already spelling this distribution's own name.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import conf from "../../pragma.conf.js";
import { BIN_NAME } from "../constants.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/**
 * Files whose strings are pinned, frozen, or owned by another lane, so changing
 * them is not a copy edit:
 * - `*.generated.ts` — build artifacts (the embedded pack's graph data).
 * - `spec/emitSurface.ts` — `FIXED_SURFACE` is deep-equalled against
 *   `surface/surface.v2.json`; changing it is a covenant change.
 * - `spec/emitReference.ts` — its output is byte-compared against the committed
 *   `docs/reference/*.md`, so changing it requires a docs regen.
 * - `config/defaults.ts` — THE distribution seam: it imports the distribution
 *   config and names the file it imports. That is its job, not a leak.
 * - `kernel/vocabulary.ts` — the same seam for the vocabulary declaration. Its
 *   diagnostics quote the file it imports, and five modules hardcode that
 *   specifier, so a fork cannot rename it: deriving the name from `BIN_NAME`
 *   here would name a path that does not exist.
 * - `runtime/graphpack/hash.ts` — `<<<pragma-pack:…>>>` are hash domain
 *   separators; changing them re-mints every pack content hash. CROSS-LANE.
 */
const EXEMPT = [
  ".generated.ts",
  "spec/emitSurface.ts",
  "spec/emitReference.ts",
  "config/defaults.ts",
  "kernel/vocabulary.ts",
  "runtime/graphpack/hash.ts",
];

/**
 * Every authored `.ts` in the kernel, plus the identity module and the bin.
 *
 * @param dir - Directory to walk.
 * @returns Absolute paths of the non-test TypeScript sources beneath it.
 * @note Impure — reads the source tree.
 */
function listSources(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listSources(path));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      found.push(path);
    }
  }
  return found;
}

const files = [
  ...listSources(join(root, "kernel")),
  join(root, "constants.ts"),
  join(root, "bin.ts"),
].filter((file) => !EXEMPT.some((suffix) => file.endsWith(suffix)));

/**
 * The authored copy in a file: every string literal that is neither a module
 * specifier nor inside a comment.
 *
 * A single left-to-right pass, not a pair of regexes, because the two orderings
 * a regex pair allows are both wrong: strip comments first and any literal
 * containing `//` is truncated, re-pairing the quotes across the deleted tail
 * and hiding whatever followed; match literals first and an apostrophe in prose
 * ("the kernel's") opens a quote that never closes, which is also the shape
 * that makes the literal pattern backtrack catastrophically. Reading the file
 * in source order makes both cases fall out: a `//` inside a string belongs to
 * the string, an apostrophe inside a comment belongs to the comment.
 *
 * A REGEX LITERAL is code, not copy, and it is the third ordering hazard: a `"`
 * inside a regex (`/[<>"{}|\\^`\s]/`) would otherwise open a phantom string that
 * swallows every literal until the next `"` — so the scanner reads regexes as
 * regexes and skips them whole.
 *
 * A TEMPLATE SUBSTITUTION is the fourth, and the one this tree actually writes:
 * `${…}` is code, and the code inside it may open another template. Reading a
 * template as one flat span makes the NESTED backtick close the OUTER literal,
 * and every quote after it in the file pairs off by one — which left the whole
 * tail of `packs/renderPack.ts` invisible to this guard. So a substitution is
 * handed back to the code scanner, and the literal chunks around it are the copy.
 *
 * Specifiers (`./x.js`, `@scope/pkg`) name modules, not users, and must stay
 * literal, so they are not copy.
 *
 * @param source - The file's text.
 * @returns The authored string literals.
 */
function readCopy(source: string): string[] {
  const copy: string[] = [];
  scanCode(source, 0, copy);
  return copy;
}

/** A `/` opens a regex only where a VALUE may start; after a value it divides. */
const REGEX_OPENS_AFTER = "=(,:[!&|?{};+-*%~^<>";

/**
 * Read code from `from`, pushing every authored literal it quotes onto `copy`.
 *
 * @param source - The file's text.
 * @param from - Index to start reading at.
 * @param copy - Accumulator the authored literals are pushed onto.
 * @param untilBrace - Stop at the `}` closing a template substitution.
 * @returns The index the scan stopped at.
 */
function scanCode(
  source: string,
  from: number,
  copy: string[],
  untilBrace = false,
): number {
  // One character of context decides regex-vs-division — the last significant
  // one — which is all TypeScript sources in this tree need (no `)`/`]`-preceded
  // regex, i.e. no `if (x) /re/.test(y)`, which would read as division).
  let previous = "";
  let braces = 0;
  for (let i = from; i < source.length; i++) {
    const char = source[i];
    if (char === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) return source.length;
      i = end + 1;
      continue;
    }
    if (char === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i + 2);
      if (end === -1) return source.length;
      i = end;
      continue;
    }
    if (
      char === "/" &&
      previous !== "" &&
      REGEX_OPENS_AFTER.includes(previous)
    ) {
      // Skip the body, honouring escapes and `[…]` classes (where an unescaped
      // `/` is an ordinary character). An unterminated regex cannot span a line,
      // so a newline ends the scan rather than eating the rest of the file.
      let inClass = false;
      i += 1;
      while (i < source.length && source[i] !== "\n") {
        const body = source[i];
        if (body === "\\") i += 1;
        else if (body === "[") inClass = true;
        else if (body === "]") inClass = false;
        else if (body === "/" && !inClass) break;
        i += 1;
      }
      previous = "/";
      continue;
    }
    if (char === "`") {
      i = scanTemplate(source, i + 1, copy);
      previous = char;
      continue;
    }
    if (char !== '"' && char !== "'") {
      if (untilBrace && char === "{") braces += 1;
      if (untilBrace && char === "}") {
        if (braces === 0) return i;
        braces -= 1;
      }
      if (!/\s/.test(char)) previous = char;
      continue;
    }
    const start = ++i;
    while (i < source.length && source[i] !== char) {
      i += source[i] === "\\" ? 2 : 1;
    }
    pushCopy(copy, source.slice(start, i));
    previous = char;
  }
  return source.length;
}

/**
 * Read a template literal's body from `from` — just past the opening backtick —
 * pushing its literal chunks onto `copy` and handing each `${…}` back to
 * {@link scanCode}, which is where a nested template is read as a template.
 *
 * @param source - The file's text.
 * @param from - Index of the first character after the opening backtick.
 * @param copy - Accumulator the authored chunks are pushed onto.
 * @returns The index of the closing backtick.
 */
function scanTemplate(source: string, from: number, copy: string[]): number {
  let chunk = "";
  let i = from;
  while (i < source.length && source[i] !== "`") {
    if (source[i] === "\\") {
      chunk += source.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (source[i] === "$" && source[i + 1] === "{") {
      i = scanCode(source, i + 2, copy, true) + 1;
      continue;
    }
    chunk += source[i];
    i += 1;
  }
  pushCopy(copy, chunk);
  return i;
}

/** Keep a literal unless it is empty or names a module rather than a user. */
function pushCopy(copy: string[], literal: string): void {
  if (literal && !literal.startsWith(".") && !literal.startsWith("@")) {
    copy.push(literal);
  }
}

/**
 * `file: literal` for every authored literal matching `pattern`, so a failure
 * names its offenders instead of only counting them.
 *
 * @param pattern - What kernel copy may not contain.
 * @returns One entry per offending literal.
 * @note Impure — reads every kernel source.
 */
function findOffenders(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of files) {
    for (const literal of readCopy(readFileSync(file, "utf-8"))) {
      if (pattern.test(literal)) {
        found.push(`${relative(root, file)}: ${literal}`);
      }
    }
  }
  return found;
}

describe("the copy scanner (PROTECTED)", () => {
  // The guard below is only as good as what the scanner can see, so the scanner
  // is pinned directly on the shape that used to blind it: `src/kernel/packs/
  // iri.ts` declares two regexes that each contain a `"`, and a leak between
  // them was invisible. DERIVED, so the probe leaks whatever this distribution
  // is called.
  const leak = `${BIN_NAME} sources update`;

  it("reads a literal sitting between two regexes that contain a quote", () => {
    const source = [
      'const UNSAFE = /[<>"{}|\\\\^`\\s]/;',
      `const LEAK = "${leak}";`,
      'const EMBEDDABLE = /^[A-Za-z][\\w+.-]*:\\/\\/[^<>"\\s]+$/;',
    ].join("\n");
    expect(readCopy(source)).toEqual([leak]);
  });

  it("reads the same literal with no regex around it", () => {
    expect(readCopy(`const LEAK = "${leak}";`)).toEqual([leak]);
  });

  it("reads a dividing slash as division, not as an opening regex", () => {
    // The division and the leak share a LINE: a scanner that read every `/` as
    // a regex opener would skip to the next `/` or the newline, whichever comes
    // first, and swallow the leak. On separate lines the regex skip stops at the
    // newline before it reaches the literal, so both scanners agree and the case
    // asserts nothing.
    const source = `const rate = done / all; const LEAK = "${leak}";`;
    expect(readCopy(source)).toEqual([leak]);
  });

  it("reads a template substitution as code, not as the end of the literal", () => {
    // `packs/renderPack.ts` writes exactly this: a template whose substitution
    // contains another template, itself containing an ESCAPED backtick. Read
    // flat, the nested backtick closes the outer literal and every quote after
    // it in the file pairs off by one — so the leak below, and the whole tail of
    // any file shaped like this, became invisible.
    const source = [
      "const hint = shape.emptyRecovery",
      "  ? `${shape.emptyRecovery.message}${",
      "      shape.emptyRecovery.cli",
      "        ? ` Run \\`${PREFIX}${shape.emptyRecovery.cli}\\`.`",
      '        : ""',
      "    }`",
      "  : DEFAULT_HINT;",
      `const LEAK = "${leak}";`,
    ].join("\n");
    expect(readCopy(source)).toContain(leak);
  });
});

describe("kernel copy (PROTECTED)", () => {
  it("no kernel string names the distribution", () => {
    // DERIVED from the shipped `name`, and ESCAPED: this guard hardcodes no
    // name, and a fork called `my.cli` or `c++tool` neither over-matches nor
    // dies compiling its own name as a pattern. The word boundaries keep
    // identifiers like `PragmaError` out while still catching the forms the
    // name actually leaks in — `pragma.config.ts`, `pragma-pack`, `pragma `.
    const name = BIN_NAME.replace(/[-.*+?^${}()|[\]\\]/g, "\\$&");
    expect(findOffenders(new RegExp(`\\b${name}\\b`, "i"))).toEqual([]);
  });

  it("no kernel string names a domain", () => {
    expect(findOffenders(/design[- ]system/i)).toEqual([]);
  });

  it("no kernel string hardcodes a namespace the distribution declares", () => {
    // The behavioural half of the same rule. A kernel module that spells out a
    // declared namespace IRI has decided what the domain is, so a fork editing
    // `pragma.conf.ts` changes the store and not the code reading it.
    //
    // DERIVED from the declaration, one pattern per namespace rather than one
    // alternation: a distribution that declares none then yields no offenders,
    // instead of an empty alternation that matches every literal.
    const offenders = Object.values(conf.prefixes ?? {}).flatMap((namespace) =>
      findOffenders(
        new RegExp(namespace.replace(/[-.*+?^${}()|[\]\\]/g, "\\$&")),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("no kernel string writes a term in a namespace the distribution declares", () => {
    // The form the kernel actually leaked the domain in. Every coupling this
    // guard exists to keep out — `ds:Prompt`, `ds:Tier`, `ds:name` — was a
    // PREFIXED NAME, which contains no namespace IRI and so passes the rule
    // above. DERIVED from the same declaration, by KEY this time.
    //
    // A leading non-word character keeps `https://…` and `foo.ds:x` out while
    // still catching a bare term, one inside a query template, and one in
    // user-facing copy.
    const offenders = Object.keys(conf.prefixes ?? {}).flatMap((prefix) =>
      findOffenders(
        new RegExp(
          `(^|[^A-Za-z0-9_])${prefix.replace(/[-.*+?^${}()|[\]\\]/g, "\\$&")}:[A-Za-z_]`,
        ),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

/**
 * The grammar positions that quote a command a user is told to RUN: an example
 * (`cmd:`), a recovery hint (`cli:`) and a doctor fix (`remedy:`).
 */
const COMMAND_POSITIONS = ["cmd", "cli", "remedy"];

/** Every authored `.ts` under `src/capabilities/**`. */
const capabilitySources = listSources(join(root, "capabilities"));

describe("capability commands (PROTECTED)", () => {
  it("no command a user is told to run is a bare literal", () => {
    // The rule that reaches `src/capabilities/**` without exempting most of it.
    // The wider "name nothing" rule cannot: that tree legitimately carries the
    // domain in runtime copy and in wire identifiers. But a command string is
    // never content — it is the installed binary's own name plus a grammar
    // path, and both are derived. So this is stated as a POSITION rule, not a
    // file rule, and carries no exemptions.
    //
    // Raw source, not `readCopy`: the position is what makes it an offence, and
    // reading the text directly means this guard holds whatever the scanner can
    // see. DERIVED and ESCAPED from the shipped `name`, as above.
    const name = BIN_NAME.replace(/[-.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(?:${COMMAND_POSITIONS.join("|")}):\\s*["'][^"']*\\b${name}\\b`,
      "i",
    );
    const offenders: string[] = [];
    for (const file of capabilitySources) {
      for (const line of readFileSync(file, "utf-8").split("\n")) {
        if (pattern.test(line)) {
          offenders.push(`${relative(root, file)}: ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
