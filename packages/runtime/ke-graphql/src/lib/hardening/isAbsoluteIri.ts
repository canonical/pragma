// =============================================================================
// The node(id:) admission gate: does this string parse as an ABSOLUTE IRI?
//
// RFC 3986 §3.1 — scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) — plus a
// non-empty remainder. Nothing beyond the scheme is validated: the rest of an
// IRI is scheme-specific and this is an admission gate, not a parser.
//
// Deliberately prefix-map-free. Rejecting an unresolvable id here (rather than
// consulting the compiled namespaces and guessing) is what makes `node(id:)`
// answer identically no matter which prefixes a consumer registered.
//
// The admission rule is fixed by the schema contract (graphql-schema-spec 1),
// so every conforming runtime admits and rejects exactly the same strings.
// =============================================================================

const CODE_A_UPPER = 65; // "A"
const CODE_Z_UPPER = 90; // "Z"
const CODE_A_LOWER = 97; // "a"
const CODE_Z_LOWER = 122; // "z"
const CODE_0 = 48; // "0"
const CODE_9 = 57; // "9"
const CODE_PLUS = 43; // "+"
const CODE_MINUS = 45; // "-"
const CODE_DOT = 46; // "."

/** Legal RFC 3986 scheme head character (ALPHA). */
const isAlpha = (code: number): boolean =>
  (code >= CODE_A_UPPER && code <= CODE_Z_UPPER) ||
  (code >= CODE_A_LOWER && code <= CODE_Z_LOWER);

/** Legal RFC 3986 scheme tail character (ALPHA / DIGIT / "+" / "-" / "."). */
const isSchemeTail = (code: number): boolean =>
  isAlpha(code) ||
  (code >= CODE_0 && code <= CODE_9) ||
  code === CODE_PLUS ||
  code === CODE_MINUS ||
  code === CODE_DOT;

/**
 * Is `value` a syntactically absolute IRI — an RFC 3986 scheme followed by a
 * colon and a non-empty remainder? Pure.
 *
 * `"urn:uuid:1234"` and `"https://x/a#T"` pass; `"Film"` (no scheme),
 * `"1http://x"` (digit-initial scheme), `":empty"` (empty scheme), and
 * `"http:"` (empty remainder) do not.
 */
export default function isAbsoluteIri(value: string): boolean {
  const colon = value.indexOf(":");
  // colon === 0 is an empty scheme; -1 is no scheme at all.
  if (colon < 1) {
    return false;
  }
  if (colon === value.length - 1) {
    return false; // nothing after the colon
  }
  if (!isAlpha(value.charCodeAt(0))) {
    return false;
  }
  for (let i = 1; i < colon; i++) {
    if (!isSchemeTail(value.charCodeAt(i))) {
      return false;
    }
  }
  return true;
}
