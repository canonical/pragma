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
import { kebabCase } from "../spec/index.js";
import type { LookupOutput } from "./resolveEntity.js";
import type {
  PackAppliedFilter,
  PackChildRow,
  PackEntity,
  PackList,
  PackLookup,
  PackPage,
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
const DEFAULT_EMPTY_HINT = `Either nothing matched — try a wider filter — or the store has nothing in it yet: build it with \`${BIN_NAME} sources update\`.`;

/**
 * Build the list formatters for a list-shaped verb (list or an extra verb).
 *
 * Every mode renders the page's ROWS, so the three output contracts are exactly
 * what they were before a list carried a page: `plain` a table, `llm` its
 * frozen condensed form, `json` the bare array. What the page adds rides the
 * `notice` seam — the channel that already exists for what the data cannot say
 * about itself, and which both machine surfaces project into `meta.notice`.
 *
 * EVERY format says it, though, because a truncation nobody is told about is a
 * wrong answer in any dialect. The seam alone did not reach `llm`: the
 * dispatcher routes a notice to stderr in `plain` and into `meta.notice` in
 * `json`, but the `llm` branch renders the body and nothing else — and `llm`
 * is what an agent (or any piped invocation, which auto-detects it) actually
 * reads. So the condensed form carries the sentence in its own body, as a final
 * line, and its heading admits the page is a page.
 *
 * A page that is the whole answer says nothing, which is why declaring the
 * default page size above every story's population left every existing answer
 * untouched, notice included.
 */
export function listFormatters(
  shape: PackList,
  meta: RenderMeta,
): Formatters<PackPage> {
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
    plain: (page, context) => renderListPlain(page.rows, options, context),
    llm: (page) => {
      const body = renderListLlm(page.rows, emptyCopy(page, meta, options), {
        more: page.nextAfter !== undefined,
      });
      const notice = pageNotice(page, meta);
      return notice ? `${body}\n\n${notice}` : body;
    },
    json: (page) => JSON.stringify(page.rows, null, 2),
    // Zero rows: the dispatcher routes this to stderr (exit 0) so the plain
    // stdout stream stays pure data; llm/json keep their own empty shapes.
    notice: (page) =>
      page.rows.length === 0
        ? renderListEmptyNotice(emptyCopy(page, meta, options))
        : pageNotice(page, meta),
  };
}

/**
 * The empty-state copy this page deserves.
 *
 * Two facts can empty a list and zero rows cannot tell them apart: nothing was
 * there, or a filter missed what was. Both are worth saying and they are not
 * exclusive, so a filtered empty page says both — the kernel's own sentence
 * names the arguments the caller typed, and the story's `emptyRecovery` follows
 * it on the next line, exactly as it does on an unfiltered page.
 *
 * It did not, briefly: a filtered empty page reported only the narrowing,
 * because the recoveries of the day asserted an empty store ("No token symbols
 * in the store … run `pragma sources update`") and so told a reader with 745
 * symbols in it to rebuild for nothing. That is a WORDING defect, and it is
 * fixed where it lives — a story's recovery is now written to hold whether the
 * population is empty or a filter missed a populated one, or the story declares
 * none. Suppressing it here cost more than it saved: `token consumers --symbol
 * color.text` narrows a table that records no bindings at all, and "No token
 * matches `--symbol color.text`." on its own read as a mistyped symbol while
 * withholding the one account of the emptiness that verb has.
 *
 * @param page - The rendered page (its rows and the filters that cut them).
 * @param meta - The noun, for the sentence.
 * @param base - The story's own empty copy.
 * @returns `base` unchanged, or `base` with the filter-shaped message — the
 *   story's own hint is kept either way.
 */
function emptyCopy(
  page: PackPage,
  meta: RenderMeta,
  base: RenderListOptions<PackRow>,
): RenderListOptions<PackRow> {
  const applied = page.filters ?? [];
  if (page.rows.length > 0 || applied.length === 0) return base;
  return {
    ...base,
    emptyMessage: `No ${meta.noun} matches ${listFilters(applied)}.`,
  };
}

/** The filters in force, as flags a reader can edit: `\`--kind input\`` … */
function listFilters(applied: readonly PackAppliedFilter[]): string {
  const flags = applied.map(
    (filter) => `\`--${kebabCase(filter.param)} ${filter.value}\``,
  );
  const last = flags.at(-1) as string;
  return flags.length === 1
    ? last
    : `${flags.slice(0, -1).join(", ")} and ${last}`;
}

/**
 * What a truncated page says for itself: that it is one, and the exact argument
 * that fetches the next.
 *
 * The cursor is printed rather than described. An opaque token a caller has to
 * be told how to obtain is a token they will guess at, and the two surfaces
 * that carry this are read by agents — so the sentence contains the flag, the
 * value, and the tool parameter, ready to copy.
 */
function pageNotice(page: PackPage, meta: RenderMeta): string | undefined {
  if (page.nextAfter === undefined) return undefined;
  return (
    `Showing ${page.rows.length} ${meta.noun} entries, and more exist. ` +
    `For the next page pass \`--after ${page.nextAfter}\` ` +
    `(\`after\` over MCP), or raise \`--limit\` (currently ${page.limit}).`
  );
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
      ...(section.note ? { note: section.note } : {}),
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
