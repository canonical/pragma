/**
 * Project a pack definition onto PR1 render option bags and the three-mode
 * {@link Formatters} each compiled verb carries.
 *
 * List rows, looked-up entities, and sample exemplars all render through the
 * shared generic renderers with a baked prefix map (display compaction only —
 * the fetch layer already resolved full IRIs). The formatters are pure and
 * zod-free, built once at compile time; the run body decides WHAT data reaches
 * them (disclosure gates the fetch), never HOW it is laid out.
 */

import { BIN_NAME, RECOVERY_CLI_PREFIX } from "../../constants.js";
import type {
  ColumnDef,
  LookupField,
  RenderListOptions,
  RenderLookupOptions,
  SectionDef,
} from "../render/index.js";
import { compactUri } from "../render/index.js";
import {
  renderListEmptyNotice,
  renderListLlm,
  renderListPlain,
  renderLookupLlm,
  renderLookupPlain,
} from "../render/renderers.js";
import type { Formatters } from "../spec/index.js";
import type { LookupOutput } from "./resolveEntity.js";
import type {
  PackChildRow,
  PackEntity,
  PackList,
  PackLookup,
  PackRow,
} from "./types.js";

/** Sample output: the drawn exemplars, the population size, and agent follow-ups. */
export interface SampleOutput {
  readonly samples: PackEntity[];
  readonly totalCount: number;
  readonly nextSteps: string[];
}

/** Presentation facts shared by every formatter a pack noun compiles. */
export interface RenderMeta {
  readonly heading: string;
  /** The noun, used to phrase the empty-state message. */
  readonly noun: string;
  readonly prefixes: Readonly<Record<string, string>>;
}

/**
 * The default empty-state hint when a pack authors no `emptyRecovery`: an empty
 * list on a BUILT store (a cold store would have failed with STORE_UNAVAILABLE
 * first) means "nothing matched", so point at both possible fixes.
 */
const DEFAULT_EMPTY_HINT = `Build the store with \`${BIN_NAME} sources update\`, or broaden the filter or channel.`;

/** Build the list formatters for a list-shaped verb (list or an extra verb). */
export function listFormatters(
  shape: PackList,
  meta: RenderMeta,
): Formatters<PackRow[]> {
  const columns: ColumnDef<PackRow>[] = shape.columns.map((column) => ({
    key: column.field,
    label: column.label ?? column.field,
  }));
  // Zero results is a calm success, not an error (see runBodies.makeListRun):
  // render a non-blank message, exit 0, JSON stays []. A pack's authored
  // `emptyRecovery` becomes the hint; otherwise the generic build/broaden hint.
  const emptyHint = shape.emptyRecovery
    ? `${shape.emptyRecovery.message}${
        shape.emptyRecovery.cli
          ? ` Run \`${RECOVERY_CLI_PREFIX}${shape.emptyRecovery.cli}\`.`
          : ""
      }`
    : DEFAULT_EMPTY_HINT;
  const options: RenderListOptions<PackRow> = {
    heading: meta.heading,
    columns,
    prefixes: meta.prefixes,
    emptyMessage: `No ${meta.noun} entries found.`,
    emptyHint,
  };
  return {
    plain: (rows, context) => renderListPlain(rows, options, context),
    llm: (rows) => renderListLlm(rows, options),
    json: (rows) => JSON.stringify(rows, null, 2),
    // Zero rows: the dispatcher routes this to stderr (exit 0) so the plain
    // stdout stream stays pure data; llm/json keep their own empty shapes.
    notice: (rows) =>
      rows.length === 0 ? renderListEmptyNotice(options) : undefined,
  };
}

/** Build the shared per-entity render options for a lookup (reused by sample). */
export function lookupOptions(
  lookup: PackLookup,
  prefixes: Readonly<Record<string, string>>,
): RenderLookupOptions<PackEntity> {
  const fields: LookupField<PackEntity>[] = (lookup.fields ?? []).map(
    (field) => ({
      label: field.label ?? field.name,
      value: (entity) => entity[field.name],
    }),
  );
  const flatSections: SectionDef<PackEntity>[] = (lookup.sections ?? []).map(
    (section) => ({
      key: section.name,
      heading: section.label ?? section.name,
      kind: section.kind ?? "field",
    }),
  );
  const expandSections: SectionDef<PackEntity>[] = (lookup.expand ?? []).map(
    (expand) => ({
      key: expand.name,
      heading: expand.heading ?? expand.name,
      kind: expand.kind ?? "list",
      ...(expand.showWhenEmpty ? { showWhenEmpty: true } : {}),
    }),
  );
  return {
    // An entity reached by IRI need not carry a `by` value, so the IRI is a
    // real title, not a fallback nobody hits — and it is titled in the form the
    // user addressed it with, not the expanded one they never typed.
    title: (entity) =>
      scalar(entity.name) ?? compactScalar(entity.uri, prefixes) ?? "(unnamed)",
    fields,
    sections: [...flatSections, ...expandSections],
    prefixes,
  };
}

/** Build the lookup formatters (every resolved entity, then errors, then the notice). */
export function lookupFormatters(
  lookup: PackLookup,
  prefixes: Readonly<Record<string, string>>,
): Formatters<LookupOutput> {
  const options = lookupOptions(lookup, prefixes);
  return {
    plain: (output) =>
      renderOutput(output, (entity) => renderLookupPlain(entity, options)),
    llm: (output) =>
      renderOutput(output, (entity) => renderLookupLlm(entity, options), "llm"),
    json: (output) => JSON.stringify(output, null, 2),
    notice: (output) => ambiguityNotice(output, prefixes),
  };
}

/**
 * The sentence a lookup owes a caller whose name reached more than one entity.
 *
 * A lookup answers with ONE entity, and for 25 live block names that entity is
 * one of two or three. Rendered like any other hit, the payload asserts more
 * than it knows — and the documented recovery, "address it by prefixed IRI",
 * cannot be acted on by anyone who has not been told there is a second IRI. So
 * the notice names them, in the compact spelling the CLI accepts back as an
 * argument.
 *
 * It rides the SAME seam as the zero-record notice — stderr in plain mode,
 * `meta.notice` on `--format json` and MCP alike — because it is the same
 * failure: a result that misrepresents itself. A second channel would have to be
 * routed, muted and tested three more times to say something this one already
 * says.
 *
 * `undefined` for an unambiguous read, so nothing is added to the overwhelming
 * majority of lookups.
 */
function ambiguityNotice(
  output: LookupOutput,
  prefixes: Readonly<Record<string, string>>,
): string | undefined {
  const ambiguous = output.ambiguous ?? [];
  if (ambiguous.length === 0) return undefined;
  return ambiguous
    .map((entry) => {
      const others = entry.others
        .map((uri) => compactUri(uri, prefixes))
        .join(", ");
      return `"${entry.query}" also names ${others} — address it by IRI.`;
    })
    .join("\n");
}

/** Build the sample formatters (renders each exemplar, then the follow-ups). */
export function sampleFormatters(
  lookup: PackLookup,
  noun: string,
  prefixes: Readonly<Record<string, string>>,
): Formatters<SampleOutput> {
  const options = lookupOptions(lookup, prefixes);
  return {
    plain: (data) => {
      const body = data.samples
        .map((entity) => renderLookupPlain(entity, options))
        .join("\n\n");
      const steps = data.nextSteps.map((step) => `  - ${step}`).join("\n");
      return `${noun} sample (${data.samples.length} of ${data.totalCount})\n\n${body}${
        steps ? `\n\nNext steps:\n${steps}` : ""
      }`.trimEnd();
    },
    llm: (data) => {
      const body = data.samples
        .map((entity) => renderLookupLlm(entity, options))
        .join("\n\n");
      const steps = data.nextSteps.map((step) => `- ${step}`).join("\n");
      return `## ${capitalize(noun)} sample (${data.samples.length} of ${data.totalCount})\n\n${body}${
        steps ? `\n\n### Next steps\n${steps}` : ""
      }`.trimEnd();
    },
    json: (data) => JSON.stringify(data, null, 2),
  };
}

/** Render each result entity, appending a compact note for any error entries. */
function renderOutput(
  output: LookupOutput,
  render: (entity: PackEntity) => string,
  mode: "plain" | "llm" = "plain",
): string {
  const bodies = output.results.map(render);
  if (output.errors.length > 0) {
    const bullet = mode === "llm" ? "- " : "  ";
    const lines = output.errors.map(
      (error) => `${bullet}${error.query}: ${error.message}`,
    );
    bodies.push(
      `${mode === "llm" ? "### Not found" : "Not found:"}\n${lines.join("\n")}`,
    );
  }
  return bodies.join("\n\n").trimEnd();
}

/** Return a value only when it is a scalar string (expands hold arrays). */
function scalar(
  value: string | readonly PackChildRow[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** A scalar URI in its prefixed display form, or undefined when it is neither. */
function compactScalar(
  value: string | readonly PackChildRow[] | undefined,
  prefixes: Readonly<Record<string, string>>,
): string | undefined {
  const uri = scalar(value);
  return uri === undefined ? undefined : compactUri(uri, prefixes);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
