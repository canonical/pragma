/**
 * Best-effort derivation of the exported symbol an `@implements` annotation
 * refers to, without a full TypeScript parse.
 */

export interface DerivedSymbol {
  /** Symbol name (e.g. "Button") */
  name: string;

  /** Declaration keyword ("const", "function", "class", "interface", ...) */
  kind: string;

  /** Whether the symbol is type-only (interface / type alias) */
  isTypeOnly: boolean;
}

const DECLARATION_AFTER =
  /^\s*(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;

const EXPORTED_DECLARATION =
  /(?:^|\n)[ \t]*export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;

const TYPE_ONLY_KINDS = new Set(["interface", "type"]);

/**
 * Find the end of the comment containing the annotation, so the declaration
 * that follows it can be inspected.
 */
function findCommentEnd(content: string, annotationIndex: number): number {
  const lineStart = content.lastIndexOf("\n", annotationIndex) + 1;
  const lineLead = content.slice(lineStart, annotationIndex);

  if (/^\s*\/\//.test(lineLead)) {
    // Line comment: the comment ends at the end of the line.
    const lineEnd = content.indexOf("\n", annotationIndex);
    return lineEnd === -1 ? content.length : lineEnd + 1;
  }

  const blockEnd = content.indexOf("*/", annotationIndex);
  if (blockEnd !== -1) {
    return blockEnd + 2;
  }

  const lineEnd = content.indexOf("\n", annotationIndex);
  return lineEnd === -1 ? content.length : lineEnd + 1;
}

/**
 * Derive the symbol an annotation refers to.
 *
 * Strategy:
 * 1. If the first statement after the annotation's comment is a declaration
 *    (`const Button = ...`, `export function foo() {}`, ...), use its name.
 *    This covers the common JSDoc-above-declaration convention.
 * 2. Otherwise (e.g. the annotation sits on a property inside an object
 *    literal), fall back to the nearest `export`ed declaration *before* the
 *    annotation — the enclosing exported value.
 * 3. If neither matches, the symbol cannot be derived.
 */
export function deriveAnnotatedSymbol(
  content: string,
  annotationIndex: number,
): DerivedSymbol | undefined {
  const afterComment = content.slice(findCommentEnd(content, annotationIndex));
  const after = DECLARATION_AFTER.exec(afterComment);
  if (after) {
    return {
      name: after[2],
      kind: after[1],
      isTypeOnly: TYPE_ONLY_KINDS.has(after[1]),
    };
  }

  const regex = new RegExp(EXPORTED_DECLARATION.source, "g");
  let enclosing: DerivedSymbol | undefined;
  let match: RegExpExecArray | null = regex.exec(content);
  while (match !== null && match.index < annotationIndex) {
    enclosing = {
      name: match[2],
      kind: match[1],
      isTypeOnly: TYPE_ONLY_KINDS.has(match[1]),
    };
    match = regex.exec(content);
  }

  return enclosing;
}
