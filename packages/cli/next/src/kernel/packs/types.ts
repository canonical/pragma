/**
 * The pack grammar (v2) — "reads as data".
 *
 * A pack maps a noun to preferred queries: a SPARQL SELECT for the list story
 * and a generated, injection-safe lookup. One grammar and one compiler
 * ({@link ../compile}) project a pack into {@link ../../spec/types.VerbSpec}s;
 * the CLI and MCP projectors then treat pack verbs like any other. This closes
 * the two old forks — three read-noun styles collapse to one pack shape, and
 * the two pack compilers collapse to one.
 *
 * These types are hand-authored and zod-free so the compiler (reached on the
 * `--help`/`__complete` fast path via `capabilities/index`) never pulls zod;
 * {@link ../schema} validates the same shapes and is imported lazily, only for
 * dynamic (config/package) packs and in tests.
 *
 * Progressive disclosure is CANONICAL: a level tag names one of
 * `constants.DETAIL_LEVELS` (`summary` < `standard` < `detailed`), and gating
 * is by that canonical index — a pack's declared `levels` is any ordered subset
 * of the canonical set.
 */

/** A list column: a SELECT variable to display. */
export interface PackColumn {
  /** SELECT variable name (without `?`). */
  readonly field: string;
  /** Column heading (defaults to the field name). */
  readonly label?: string;
}

/** A looked-up value: an output name bound to a property of the entity. */
export interface PackField {
  /** Output field name on the looked-up entity. */
  readonly name: string;
  /** Property to read — a prefixed name (`ds:tier`) or absolute IRI. */
  readonly property: string;
  /** Display label (defaults to the field name). */
  readonly label?: string;
  /**
   * Explicit GraphQL field name for `source: "graphql"` lookups — the escape
   * hatch when the ontology→schema derivation does not match the compiled
   * schema. Ignored on the SPARQL path.
   */
  readonly graphqlField?: string;
  /**
   * Minimum canonical disclosure level at which this value is fetched and
   * rendered. Omitted means the base level (always included). Below its level
   * the value is excluded from the generated query/document.
   */
  readonly level?: string;
}

/** A long-form lookup section (inline field or code block). */
export interface PackSection extends PackField {
  /** Rendering kind (inline field or fenced code block). */
  readonly kind?: "field" | "code";
}

/** A field read from each child node of a {@link PackExpand}. */
export interface PackExpandField {
  /** Output field name on the child record. */
  readonly name: string;
  /** Property to read on the child node — prefixed name, IRI, or path. */
  readonly property: string;
  /** Display label (defaults to the field name). */
  readonly label?: string;
  /** Explicit GraphQL field name (escape hatch). Ignored on the SPARQL path. */
  readonly graphqlField?: string;
}

/**
 * A second-hop projection inside an expand's `select` — GraphQL source only.
 * One extra level (child → grandchildren); a nested expand's `select` admits
 * only scalar fields, so nesting stops here. Rejected on `source: "sparql"`.
 */
export interface PackNestedExpand {
  /** Output field holding the grandchild values on each child record. */
  readonly name: string;
  /** Relation from the child node to each grandchild — prefixed name or IRI. */
  readonly relation: string;
  /** Explicit GraphQL field name (escape hatch over the derived name). */
  readonly graphqlField?: string;
  /** Scalar fields to read from each grandchild. */
  readonly select: readonly PackExpandField[];
}

/** One entry of an expand's `select`: a child field or a nested expand. */
export type PackExpandSelect = PackExpandField | PackNestedExpand;

/** Whether an expand-select entry is a nested expand (vs a plain field). */
export function isNestedExpand(
  entry: PackExpandSelect,
): entry is PackNestedExpand {
  return "relation" in entry;
}

/**
 * A multi-valued nested projection: `entity → relation → child nodes`, each
 * child projected to a small record. Resolved with a generated, injection-safe
 * sub-SELECT bound to the already-resolved entity IRI (never user input) on the
 * SPARQL path, or one document hop on the GraphQL path.
 */
export interface PackExpand {
  /** Output field holding the child array on the looked-up entity. */
  readonly name: string;
  /** Section heading (defaults to the field name). */
  readonly heading?: string;
  /** Render kind for the array (`list` or `table`; defaults to `list`). */
  readonly kind?: "list" | "table";
  /** Relation from the entity to each child node — prefixed name, IRI, or path. */
  readonly relation: string;
  /** Explicit GraphQL field name (escape hatch). Ignored on the SPARQL path. */
  readonly graphqlField?: string;
  /**
   * Fields to read from each child node. On `source: "graphql"` lookups an
   * entry may instead be one {@link PackNestedExpand} level.
   */
  readonly select: readonly PackExpandSelect[];
  /** Render the section even when the array is empty (default: false). */
  readonly showWhenEmpty?: boolean;
  /** Minimum canonical disclosure level at which this expand is fetched. */
  readonly level?: string;
}

/**
 * Progressive-disclosure capability for a lookup. Declares an ordered subset of
 * the canonical levels (the first is the base/default, always shown); the
 * compiler derives a `--detail`/`detail` selector and gates fields/expands by
 * canonical index.
 */
export interface PackDisclosure {
  /** Ordered canonical level names (`⊆ constants.DETAIL_LEVELS`). */
  readonly levels: readonly string[];
  /** Default level when none is requested (must be one of `levels`). */
  readonly default?: string;
}

/**
 * A declarative list filter: a CLI/MCP parameter constraining one SELECT
 * variable. Filters are row predicates applied AFTER the author query runs — the
 * query text is never modified, so filter input cannot inject SPARQL.
 */
export interface PackFilter {
  /** Parameter name — a single lowercase word (`--param` / MCP key). */
  readonly param: string;
  /** SELECT variable the filter constrains (without `?`). */
  readonly variable: string;
  /**
   * Allowed values; anything else is rejected with INVALID_INPUT and the set
   * projects to an enum. Omitted when the value set is data-driven (a free
   * string matched case-insensitively against the variable).
   */
  readonly values?: readonly string[];
  /** Help text (defaults to a generated description). */
  readonly description?: string;
}

/**
 * Free-text search over list rows: a `--search` string keeping a row when ANY
 * named SELECT variable contains the term (case-insensitive substring). Applied
 * after the author query, so input never touches the query text.
 */
export interface PackSearch {
  /** SELECT variables searched (without `?`). */
  readonly variables: readonly string[];
  /** Help text (defaults to a generated description). */
  readonly description?: string;
}

/** Opt-in empty-result recovery for a list story. */
export interface PackEmptyRecovery {
  /** Human-readable cause + fix (e.g. which packages provide the data). */
  readonly message: string;
  /** Runnable pragma command fixing the emptiness (rendered on the CLI). */
  readonly cli?: string;
}

/** The list half of a pack (always SPARQL-sourced). */
export interface PackList {
  /** SPARQL SELECT producing one row per item. */
  readonly query: string;
  /** Columns to render, referencing SELECT variables. */
  readonly columns: readonly PackColumn[];
  /** Declarative filters projected to CLI flags and MCP parameters. */
  readonly filters?: readonly PackFilter[];
  /** Free-text search projected to a `--search` flag / `search` parameter. */
  readonly search?: PackSearch;
  /** Opt-in empty-result recovery (typed EMPTY_RESULTS instead of an empty list). */
  readonly emptyRecovery?: PackEmptyRecovery;
}

/**
 * An additional list-shaped verb: `<noun> <verb>` compiled through the SAME
 * machinery as `list` (e.g. standard's `categories`). May not collide with the
 * compiled `list`/`lookup`/`sample` verbs.
 */
export interface PackVerb extends PackList {
  /** Verb name (kebab-case), e.g. `"categories"`. */
  readonly verb: string;
  /** CLI description for the command. */
  readonly description?: string;
  /** MCP tool description (defaults to the CLI description). */
  readonly toolDescription?: string;
}

/**
 * The sample capability: `<noun> sample [count]` returns 1–5 randomly selected
 * complete entities (resolved through the lookup path at the HIGHEST level).
 */
export interface PackSample {
  /** Default sample count when none is requested (1–5; default 2). */
  readonly count?: number;
  /**
   * Omit the `[count]` positional — the sample always returns {@link count}
   * (default 2) entries. Used where the covenant freezes a no-argument sample
   * (`block`/`modifier`/`token`); `standard` keeps the `[count]` positional.
   */
  readonly fixedCount?: boolean;
  /** CLI description for the command. */
  readonly description?: string;
  /** MCP tool description (defaults to the CLI description). */
  readonly toolDescription?: string;
}

/**
 * The lookup half of a pack. The query is generated from `by` and `type`/`types`
 * — user-supplied names are escaped by the generator, never interpolated by the
 * author. The `source` selects the field-fetch strategy; the name→URI resolve is
 * ALWAYS generated SPARQL regardless of source (an implementation detail, not a
 * second declared source).
 */
export interface PackLookup {
  /**
   * Field-fetch strategy (default `"sparql"`). `"graphql"` keeps the SPARQL
   * name→URI resolve, then fetches all fields/sections/expands in ONE generated
   * document executed in-process against the compiled schema. Both sources
   * unwrap to the same flat {@link PackEntity} shape.
   */
  readonly source?: "sparql" | "graphql";
  /** Property whose value names the entity — prefixed name or IRI. */
  readonly by: string;
  /** Optional single class constraint — prefixed name or IRI. */
  readonly type?: string;
  /** CLI description for the lookup command (defaults to a generated one). */
  readonly description?: string;
  /** MCP tool description for the lookup verb (authored one-liner). */
  readonly toolDescription?: string;
  /**
   * Class constraints when entities span several classes — projected as a SPARQL
   * VALUES constraint on the name resolve. Mutually exclusive with `type`.
   */
  readonly types?: readonly string[];
  /**
   * GraphQL type or interface the generated document's inline fragment targets
   * (`source: "graphql"` only). Defaults to the local name of `type`; required
   * when `types` is used (an interface covering all of them, e.g. `"UIBlock"`).
   */
  readonly graphqlType?: string;
  /** Inline fields shown under the entity title. */
  readonly fields?: readonly PackField[];
  /** Long-form sections shown after the fields. */
  readonly sections?: readonly PackSection[];
  /** Multi-valued nested projections (structured sections). */
  readonly expand?: readonly PackExpand[];
  /** Progressive-disclosure levels; enables the derived `--detail` flag. */
  readonly disclosure?: PackDisclosure;
  /** Sample capability: `true` for defaults, or a configured sample. */
  readonly sample?: true | PackSample;
}

/** A pack list row / flat lookup base: variable name → string value. */
export type PackRow = Record<string, string>;

/**
 * A child record under an expand. Scalar values come from child fields; a nested
 * expand contributes either a collapsed string array (single-field select) or
 * one small record per grandchild.
 */
export type PackChildRow = Record<
  string,
  string | readonly string[] | readonly PackRow[]
>;

/**
 * A looked-up pack entity: flat string values plus any expanded child arrays.
 * Both fetch sources resolve to this same shape, so rendering, `--format json`,
 * and the MCP envelope are identical downstream regardless of the fetch layer.
 */
export type PackEntity = Record<string, string | readonly PackChildRow[]>;

/** One declarative read story: a noun with its preferred queries. */
export interface PackDefinition {
  /** Command noun (kebab-case), e.g. `"standard"` → `pragma2 standard list`. */
  readonly noun: string;
  /** CLI description for the list command. */
  readonly description?: string;
  /** MCP tool description (defaults to the CLI description). */
  readonly toolDescription?: string;
  /**
   * The list story. Optional so a pack can serve only the lookup verb of a noun
   * whose list stays hand-written (e.g. `block`). At least one of `list`/`lookup`
   * must be declared.
   */
  readonly list?: PackList;
  /** Additional list-shaped verbs beyond `list` (e.g. `categories`). */
  readonly verbs?: readonly PackVerb[];
  /** The lookup story. */
  readonly lookup?: PackLookup;
}

/** A validated pack definition paired with where it was declared. */
export interface PackEntry {
  /** Where the definition was declared (config path, package file, or bundled). */
  readonly source: string;
  readonly definition: PackDefinition;
}
