/**
 * Serialize an entity's neighbourhood as Turtle — the dense form of the read.
 *
 * The JSON projection is faithful but expensive: one named node costs about 95
 * bytes of wrapper to convey thirteen characters, and that overhead is paid per
 * term. Measured on one button, structure alone was ~6.1 KB of a 15.8 KB read.
 * Turtle spends the prefixes ONCE and then writes each term as itself.
 *
 * It is not merely shorter — it is the shape this data already has:
 *
 * - IRI versus literal is SYNTAX (`ds:Foo` against `"Foo"`), which is the whole
 *   thing the typed-term projection had to carry a `termType` field to say.
 * - A blank node is `[ … ]` inline, which is exactly the record the reader
 *   assembles by hand for the JSON form.
 * - Datatypes and language tags are native (`"x"@en`, `"2026-02-20"^^xsd:date`).
 * - An inbound edge is just a triple written the other way round. The whole
 *   `InboundGroup` structure exists only because JSON cannot point an arrow
 *   backwards.
 *
 * Counts, samples and truncations ride as `#` comments. That is not a fallback:
 * a comment is the one place a serialization can say something ABOUT the data
 * without asserting it as data, and a reader — human or model — takes it the
 * same way.
 *
 * Pure: it reads only the projection it is handed, so the same neighbourhood
 * always renders the same bytes.
 */

import type {
  InboundGroup,
  InspectResult,
  NestedRecord,
  ReadTerm,
} from "../runtime/readEntity.js";

/** Characters that must be escaped inside a single-line Turtle literal. */
const ESCAPES: Readonly<Record<string, string>> = {
  "\\": "\\\\",
  '"': '\\"',
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
};

/** Whether a literal is better served by a triple-quoted long string. */
function isMultiline(value: string): boolean {
  return value.includes("\n");
}

/** Escape a literal for the single-line `"…"` form. */
function escapeShort(value: string): string {
  return value.replace(/[\\"\n\r\t]/g, (char) => ESCAPES[char] ?? char);
}

/**
 * Escape a literal for the `"""…"""` form.
 *
 * Only backslashes and a trailing/tripled quote need attention there — newlines
 * are the entire point of the form and must survive untouched, which is what
 * keeps an embedded YAML or Markdown body readable rather than turning it into
 * one `\n`-riddled line.
 */
function escapeLong(value: string): string {
  return (
    value
      .replace(/\\/g, "\\\\")
      .replace(/"""/g, '\\"\\"\\"')
      // A value ENDING in a quote would run straight into the closing delimiter
      // and produce four quotes, which no parser reads as intended. Truncation
      // makes this reachable on ordinary prose, not just on hostile input.
      .replace(/"$/, '\\"')
  );
}

/** Render one term in Turtle: a prefixed name, an `<iri>`, or a literal. */
function renderTerm(term: ReadTerm): string {
  if (term.termType === "NamedNode") {
    return term.prefixed ?? `<${term.value}>`;
  }
  if (term.termType === "BlankNode") {
    // A bare `[]` — the label is store-local and re-minted on every load, so
    // writing it would publish an identifier that means nothing on the next read.
    return "[]";
  }
  const body = isMultiline(term.value)
    ? `"""${escapeLong(term.value)}"""`
    : `"${escapeShort(term.value)}"`;
  if (term.language) return `${body}@${term.language}`;
  if (term.datatype) return `${body}^^${term.datatype}`;
  return body;
}

/**
 * `# ds:guidelines — 5,814 chars, showing 400` — states a preview as a preview.
 *
 * On its OWN line ABOVE the triple, never trailing it: a Turtle comment runs to
 * end of line, so a note placed after the object swallows the `;` or `.` that
 * terminates the statement and silently breaks the document.
 */
function truncationNote(predicate: string, term: ReadTerm): string | undefined {
  if (!term.truncated || term.length === undefined) return undefined;
  const total = term.length.toLocaleString("en-US");
  return `  # ${predicate} — ${total} chars, showing ${term.value.length}`;
}

/** Render one inlined blank node as a Turtle `[ … ]` record. */
function renderNested(record: NestedRecord): string {
  const fields = Object.entries(record).map(([field, value]) => {
    // `type` was hoisted out of the record body on the way in; `a` is Turtle's
    // own shorthand for it, so it goes back exactly where it came from.
    const predicate = field === "type" ? "a" : field;
    return `${predicate} ${renderTerm(value)}`;
  });
  return `[ ${fields.join(" ; ")} ]`;
}

/** The prefixes a rendering actually uses, so the header declares no more. */
function usedPrefixes(
  text: string,
  prefixes: Readonly<Record<string, string>>,
): string[] {
  return Object.entries(prefixes)
    .filter(([prefix]) => new RegExp(`\\b${prefix}:`).test(text))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, namespace]) => `@prefix ${prefix}: <${namespace}> .`);
}

/** `# rdf:type — 330 total, sample of 5` and the triples under it. */
function renderInbound(subject: string, group: InboundGroup): string[] {
  const predicate = renderTerm(group.predicate);
  const total = group.count.toLocaleString("en-US");
  const note = group.sampled
    ? `# ${predicate} — ${total} total, sample of ${group.subjects.length}; use the noun's list verb for the full set`
    : group.truncated
      ? `# ${predicate} — ${total} total, showing ${group.subjects.length}`
      : `# ${predicate} — ${total}`;
  return [
    note,
    ...group.subjects.map((s) => `${renderTerm(s)} ${predicate} ${subject} .`),
  ];
}

/**
 * Render an entity's neighbourhood as a Turtle document.
 *
 * @param result - The neighbourhood projection to serialize.
 * @param prefixes - The store's merged prefix map, for the `@prefix` header.
 * @returns A Turtle document: header, the subject's own triples, its inlined
 *   blank nodes, then the edges pointing at it.
 */
export function toTurtle(
  result: InspectResult,
  prefixes: Readonly<Record<string, string>>,
): string {
  const subject = result.prefixed ?? `<${result.uri}>`;
  const body: string[] = [];

  // The subject's own triples, one predicate per line.
  const predicates: string[] = [];
  for (const group of result.groups) {
    const predicate = renderTerm(group.predicate);
    // Blank objects are written as their inlined records instead, so they are
    // skipped here — emitting both would assert the same edge twice.
    const objects = group.objects.filter((o) => o.termType !== "BlankNode");
    if (objects.length === 0) continue;
    const keyword = predicate === "rdf:type" ? "a" : predicate;
    // Notes are folded INTO the element, above its statement, so the `;` the
    // join appends always lands on the statement line. Pushed as siblings they
    // would each take a separator of their own — into a comment, which runs to
    // end of line and eats it.
    const notes = objects
      .map((o) => truncationNote(keyword, o))
      .filter((n): n is string => n !== undefined);
    const rendered = objects.map(renderTerm).join(", ");
    predicates.push([...notes, `  ${keyword} ${rendered}`].join("\n"));
  }
  for (const [via, records] of Object.entries(result.nested)) {
    predicates.push(
      `  ${via}\n    ${records.map(renderNested).join(",\n    ")}`,
    );
  }
  if (predicates.length > 0) {
    body.push(`${subject}\n${predicates.join(" ;\n")} .`);
  }

  if (result.inbound.length > 0) {
    body.push("", "# ── referenced by ──");
    for (const group of result.inbound) {
      body.push(...renderInbound(subject, group));
    }
  }

  const text = body.join("\n");
  const header = usedPrefixes(text, prefixes);
  return [...header, "", text].join("\n").trimEnd();
}
