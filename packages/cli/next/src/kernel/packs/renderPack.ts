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

import type {
  ColumnDef,
  LookupField,
  RenderListOptions,
  RenderLookupOptions,
  SectionDef,
} from "../render/contracts.js";
import {
  renderListLlm,
  renderListPlain,
  renderLookupLlm,
  renderLookupPlain,
} from "../render/renderers.js";
import type { Formatters } from "../spec/types.js";
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
  readonly prefixes: Readonly<Record<string, string>>;
}

/** Build the list formatters for a list-shaped verb (list or an extra verb). */
export function listFormatters(
  shape: PackList,
  meta: RenderMeta,
): Formatters<PackRow[]> {
  const columns: ColumnDef<PackRow>[] = shape.columns.map((column) => ({
    key: column.field,
    label: column.label ?? column.field,
  }));
  const options: RenderListOptions<PackRow> = {
    heading: meta.heading,
    columns,
    prefixes: meta.prefixes,
  };
  return {
    plain: (rows) => renderListPlain(rows, options),
    llm: (rows) => renderListLlm(rows, options),
    json: (rows) => JSON.stringify(rows, null, 2),
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
    title: (entity) => scalar(entity.name) ?? scalar(entity.uri) ?? "(unnamed)",
    fields,
    sections: [...flatSections, ...expandSections],
    prefixes,
  };
}

/** Build the lookup formatters (renders every resolved entity, then any errors). */
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
  };
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
