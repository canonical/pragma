/**
 * IRI utilities for pack lookups addressed by prefixed name or absolute IRI.
 *
 * `resolveUri` expands a prefixed name through the store's merged prefix map (a
 * registered prefix always wins; a foreign absolute IRI passes through);
 * `isEmbeddableIri` is the stricter `scheme://…` shape a resolved IRI must match
 * before it can be interpolated into a generated `<iri>` query token.
 */

import { cliRecovery, PragmaError } from "../error/index.js";

/** Characters not allowed inside a SPARQL `<IRI>`. */
const UNSAFE_IRI_PATTERN = /[<>"{}|\\^`\s]/;

/** A general absolute IRI: `scheme://…` (http, https, …) or a `urn:` opaque IRI. */
const ABSOLUTE_IRI_PATTERN = /^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|urn:)\S/i;

/** The embeddable-IRI shape: an authority-bearing `scheme://…` with no IRI-breakers. */
const EMBEDDABLE_IRI_PATTERN = /^[A-Za-z][\w+.-]*:\/\/[^<>"\s]+$/;

/** Whether a resolved IRI is safe to embed as a `<iri>` query token. */
export function isEmbeddableIri(value: string): boolean {
  return EMBEDDABLE_IRI_PATTERN.test(value);
}

/**
 * Resolve a prefixed or absolute URI to its full form.
 *
 * A value that fails to resolve and carries a `%` is retried once decoded, so a
 * client that percent-encodes the URI it addresses (`ds%3AComponent`) is served
 * rather than rejected. Every diagnostic names the value the CALLER supplied —
 * the safety check runs on the expansion, but nobody typed the expansion.
 *
 * @param uri - A full or prefixed URI string.
 * @param prefixes - The store's merged prefix→namespace map.
 * @returns The fully expanded URI.
 * @throws PragmaError INVALID_INPUT when the format is invalid or the prefix is unknown.
 */
export function resolveUri(
  uri: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  const direct = tryResolveUri(uri, prefixes);
  if (typeof direct === "string") return direct;

  const decoded = uri.includes("%") ? decodeOnce(uri) : undefined;
  if (decoded !== undefined && decoded !== uri) {
    const viaDecoded = tryResolveUri(decoded, prefixes);
    if (typeof viaDecoded === "string") return viaDecoded;
  }

  // Report the input as given, never the decoded or expanded form.
  throw direct;
}

/**
 * One resolution attempt: the expanded IRI, or the error describing `uri`.
 *
 * @param uri - The candidate URI, as the caller wrote it.
 * @param prefixes - The store's merged prefix→namespace map.
 * @returns The expanded IRI on success, else the PragmaError to report.
 */
function tryResolveUri(
  uri: string,
  prefixes: Readonly<Record<string, string>>,
): string | PragmaError {
  const colonIdx = uri.indexOf(":");
  if (colonIdx === -1) {
    return PragmaError.invalidInput("uri", uri, {
      recovery: {
        message: 'Use a prefixed URI (e.g. "prefix:name") or a full URI.',
      },
    });
  }

  const prefix = uri.slice(0, colonIdx);
  const namespace = prefixes[prefix];
  if (namespace !== undefined) {
    const resolved = `${namespace}${uri.slice(colonIdx + 1)}`;
    return unsafeIriError(uri, resolved) ?? resolved;
  }

  if (ABSOLUTE_IRI_PATTERN.test(uri)) {
    return unsafeIriError(uri, uri) ?? uri;
  }

  return PragmaError.invalidInput("prefix", prefix, {
    validOptions: Object.keys(prefixes),
    recovery: cliRecovery("ontology list", "List known ontology prefixes.", {
      tool: "ontology_list",
    }),
  });
}

/**
 * Guard the EXPANSION, name the INPUT: the check is on the IRI that would reach
 * a query, the message is about the value the caller actually typed.
 *
 * @param input - The URI as the caller wrote it.
 * @param resolved - The expanded IRI the check runs against.
 * @returns The error when `resolved` carries IRI-breaking characters, else undefined.
 */
function unsafeIriError(
  input: string,
  resolved: string,
): PragmaError | undefined {
  if (!UNSAFE_IRI_PATTERN.test(resolved)) return undefined;
  return PragmaError.invalidInput("uri", input, {
    recovery: { message: "URI contains characters not allowed in IRIs." },
  });
}

/**
 * Percent-decode a value, tolerating malformed encodings.
 *
 * `decodeURIComponent` throws `URIError` on a stray `%` — a decode ATTEMPT must
 * never turn a reportable input error into a crash.
 *
 * @param value - The possibly percent-encoded value.
 * @returns The decoded value, or undefined when it cannot be decoded.
 */
function decodeOnce(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
