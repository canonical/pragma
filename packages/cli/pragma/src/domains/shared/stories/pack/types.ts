/**
 * Declarative story-pack definitions — read stories as data.
 *
 * A story pack maps a noun to preferred queries: a SPARQL SELECT for the
 * list story and a generated, injection-safe lookup. Definitions are
 * declared in `pragma.config.json` (`stories`) or shipped by semantic
 * packages (`stories/*.json`) and compiled through the read-story kernel
 * into CLI commands and MCP tools at boot.
 *
 * @experimental The story-pack format (v0) is experimental: field names,
 * lookup generation, and rendering semantics may change while GraphQL
 * document queries and SHACL-derived defaults are designed.
 */

/** A list column: a SELECT variable to display. */
export interface StoryPackColumn {
  /** SELECT variable name (without `?`). */
  readonly field: string;
  /** Column heading (defaults to the field name). */
  readonly label?: string;
}

/** A looked-up value: an output name bound to a property of the entity. */
export interface StoryPackField {
  /** Output field name on the looked-up entity. */
  readonly name: string;
  /** Property to read — a prefixed name (`ex:category`) or absolute IRI. */
  readonly property: string;
  /** Display label (defaults to the field name). */
  readonly label?: string;
  /**
   * Explicit GraphQL field name for `source: "graphql"` lookups — the
   * escape hatch for when the ontology→schema name derivation (strip
   * `has`/`is`, pluralize) does not match the compiled schema. Ignored on
   * the SPARQL path.
   */
  readonly graphqlField?: string;
  /**
   * Minimum disclosure level at which this value is fetched and rendered —
   * a name from {@link StoryPackDisclosure.levels}. Omitted means the base
   * level (always included). Below its level the value is excluded from the
   * generated query/document, so the renderer omits the (absent) output.
   */
  readonly level?: string;
}

/** A long-form lookup section. */
export interface StoryPackSection extends StoryPackField {
  /** Rendering kind (v0 supports inline fields and code blocks). */
  readonly kind?: "field" | "code";
}

/** A field read from each child node of an {@link StoryPackExpand}. */
export interface StoryPackExpandField {
  /** Output field name on the child record. */
  readonly name: string;
  /** Property to read on the child node — prefixed name, IRI, or path. */
  readonly property: string;
  /** Display label (defaults to the field name). */
  readonly label?: string;
  /**
   * Explicit GraphQL field name for `source: "graphql"` lookups (escape
   * hatch over the derived name). Ignored on the SPARQL path.
   */
  readonly graphqlField?: string;
}

/**
 * A second-hop projection inside an expand's `select` — GraphQL source only.
 *
 * Where a plain {@link StoryPackExpandField} reads a property of the child
 * node, a nested expand follows one more relation from the child and
 * projects each grandchild (e.g. block → modifier families → values). One
 * extra level is all the data needs, so nesting stops here: a nested
 * expand's own `select` admits only scalar fields. Rejected on
 * `source: "sparql"` lookups, whose per-expand sub-SELECT is single-hop.
 */
export interface StoryPackNestedExpand {
  /** Output field holding the grandchild values on each child record. */
  readonly name: string;
  /** Relation from the child node to each grandchild — prefixed name or IRI. */
  readonly relation: string;
  /** Explicit GraphQL field name (escape hatch over the derived name). */
  readonly graphqlField?: string;
  /**
   * Scalar fields to read from each grandchild. A single-field select
   * collapses each grandchild to that field's value (`values: ["Dense",
   * "Comfortable"]`); a multi-field select yields one record per grandchild.
   */
  readonly select: readonly StoryPackExpandField[];
}

/** One entry of an expand's `select`: a child field or a nested expand. */
export type StoryPackExpandSelect =
  | StoryPackExpandField
  | StoryPackNestedExpand;

/** Whether an expand select entry is a nested expand (vs a plain field). */
export function isNestedExpand(
  entry: StoryPackExpandSelect,
): entry is StoryPackNestedExpand {
  return "relation" in entry;
}

/**
 * A multi-valued nested projection: `entity → relation → child nodes`, each
 * child projected to a small record. This is pack v1's structured-section
 * primitive — the one thing v0 could not express (dos/donts, token scales,
 * modifier values). Resolved with a generated, injection-safe sub-SELECT bound
 * to the already-resolved entity IRI (never user input), so it needs no
 * GraphQL. Rendered through the shared `list`/`table` render-kinds.
 */
export interface StoryPackExpand {
  /** Output field holding the child array on the looked-up entity. */
  readonly name: string;
  /** Section heading (defaults to the field name). */
  readonly heading?: string;
  /** Render kind for the array (v1: `list` or `table`; defaults to `list`). */
  readonly kind?: "list" | "table";
  /** Relation from the entity to each child node — prefixed name, IRI, or path. */
  readonly relation: string;
  /**
   * Explicit GraphQL field name for `source: "graphql"` lookups (escape
   * hatch over the derived name). Ignored on the SPARQL path.
   */
  readonly graphqlField?: string;
  /**
   * Fields to read from each child node. On `source: "graphql"` lookups an
   * entry may instead be one {@link StoryPackNestedExpand} level.
   */
  readonly select: readonly StoryPackExpandSelect[];
  /** Render the section even when the array is empty (default: false). */
  readonly showWhenEmpty?: boolean;
  /**
   * Minimum disclosure level at which this expand is fetched and rendered — a
   * name from {@link StoryPackDisclosure.levels}. Omitted means the base level
   * (always included). Below its level the sub-SELECT never runs, so gating is
   * both a cost and a rendering control.
   */
  readonly level?: string;
}

/**
 * Progressive-disclosure capability for a lookup.
 *
 * Declares an **ordered** list of named levels (the first is the base/default,
 * always shown). Fields/expands tag themselves with the minimum level at which
 * they appear. The compiler derives from this one declaration: a `--detail
 * <level>` CLI flag, a `detail` MCP parameter (enumerated from the levels), and
 * the JSON/plain/llm projection for the selected level. Levels are additive and
 * optional — a lookup with no disclosure exposes no detail flag.
 */
export interface StoryPackDisclosure {
  /** Ordered level names, lowest → highest. The first is the base/default. */
  readonly levels: readonly string[];
  /** Default level when none is requested (must be one of `levels`). */
  readonly default?: string;
}

/**
 * A declarative list filter: a CLI/MCP parameter constraining one SELECT
 * variable.
 *
 * Filters are row predicates applied AFTER the author query runs — the
 * query text is never modified, so filter input cannot inject SPARQL,
 * and the author's ORDER BY is preserved.
 */
export interface StoryPackFilter {
  /**
   * Parameter name — a single lowercase word, exposed as `--param` on the
   * CLI and as the parameter key on the MCP tool.
   */
  readonly param: string;
  /** SELECT variable the filter constrains (without `?`). */
  readonly variable: string;
  /**
   * Allowed values; anything else is rejected with INVALID_INPUT and the
   * set projects to CLI select choices and an MCP enum. Omitted when the
   * value set is data-driven (e.g. categories that live in the graph): the
   * parameter is then a free string matched case-insensitively against the
   * variable — still a post-query row predicate, never query text.
   */
  readonly values?: readonly string[];
  /** Help text (defaults to a generated description). */
  readonly description?: string;
}

/**
 * Free-text search over list rows: a `--search` string parameter that
 * keeps a row when ANY named SELECT variable's value contains the term
 * (case-insensitive substring). Like filters, search is applied after the
 * author query runs — user input never touches the query text.
 */
export interface StoryPackSearch {
  /** SELECT variables searched (without `?`). */
  readonly variables: readonly string[];
  /** Help text (defaults to a generated description). */
  readonly description?: string;
}

/** The list half of a story pack. */
export interface StoryPackList {
  /** SPARQL SELECT producing one row per item. */
  readonly query: string;
  /** Columns to render, referencing SELECT variables. */
  readonly columns: readonly StoryPackColumn[];
  /** Declarative filters projected to CLI flags and MCP parameters. */
  readonly filters?: readonly StoryPackFilter[];
  /** Free-text search projected to a `--search` flag / `search` parameter. */
  readonly search?: StoryPackSearch;
}

/**
 * An additional list-shaped verb: `<noun> <verb>` and `<noun>_<verb>`
 * compiled through the SAME machinery as `list` (query, columns, filters,
 * search) — e.g. standard's `categories`. The verb may not collide with
 * the compiled `list`/`lookup`/`sample` verbs.
 */
export interface StoryPackVerb extends StoryPackList {
  /** Verb name (kebab-case), e.g. `"categories"`. */
  readonly verb: string;
  /** CLI description for the command. */
  readonly description?: string;
  /** MCP tool description (defaults to the CLI description). */
  readonly toolDescription?: string;
}

/**
 * The sample capability: `<noun> sample [count]` and `<noun>_sample`
 * return 1–5 randomly selected complete entities (resolved through the
 * lookup path at the HIGHEST disclosure level) so agents can learn the
 * data shape before querying.
 */
export interface StoryPackSample {
  /** Default sample count when none is requested (1–5; default 2). */
  readonly count?: number;
  /** CLI description for the command. */
  readonly description?: string;
  /** MCP tool description (defaults to the CLI description). */
  readonly toolDescription?: string;
}

/**
 * The lookup half of a story pack. The query is generated from `type` and
 * `by` — user-supplied names are escaped by the generator, never
 * interpolated by the author.
 */
export interface StoryPackLookup {
  /**
   * Fetch strategy for the looked-up entity (default `"sparql"`).
   *
   * `"sparql"` resolves everything with generated SELECTs. `"graphql"`
   * keeps the generated SPARQL name→URI resolve (the OWL-derived schema has
   * no name-based lookup root) and then fetches all fields, sections, and
   * expands in ONE generated GraphQL document executed in-process against
   * the runtime's compiled schema. The result is unwrapped to the same flat
   * entity shape the SPARQL path produces — renderers, JSON output, and the
   * MCP envelope are identical downstream.
   */
  readonly source?: "sparql" | "graphql";
  /** Property whose value names the entity — prefixed name or IRI. */
  readonly by: string;
  /** Optional class constraint — prefixed name or IRI. */
  readonly type?: string;
  /** CLI description for the lookup command (defaults to a generated one). */
  readonly description?: string;
  /** MCP tool description (defaults to a generated one). */
  readonly toolDescription?: string;
  /**
   * Class constraints when entities span several classes (e.g. blocks are
   * Components, Patterns, Layouts, or Subcomponents) — projected as a
   * SPARQL VALUES constraint on the name resolve. Mutually exclusive with
   * `type`.
   */
  readonly types?: readonly string[];
  /**
   * GraphQL type or interface the generated document's inline fragment
   * targets (`source: "graphql"` only). Defaults to the local name of
   * `type`; required when `types` is used (an interface covering all of
   * them, e.g. `"UIBlock"`).
   */
  readonly graphqlType?: string;
  /** Inline fields shown under the entity title. */
  readonly fields?: readonly StoryPackField[];
  /** Long-form sections shown after the fields. */
  readonly sections?: readonly StoryPackSection[];
  /** Multi-valued nested projections (pack v1 structured sections). */
  readonly expand?: readonly StoryPackExpand[];
  /** Progressive-disclosure levels; enables the derived `--detail` flag. */
  readonly disclosure?: StoryPackDisclosure;
  /** Sample capability: `true` for defaults, or a configured sample. */
  readonly sample?: true | StoryPackSample;
}

/** A pack list row / flat lookup base: variable name → string value. */
export type PackRow = Record<string, string>;

/**
 * A child record under an expand. Scalar values come from child fields; a
 * nested expand contributes either a collapsed string array (single-field
 * select) or one small record per grandchild.
 */
export type PackChildRow = Record<
  string,
  string | readonly string[] | readonly PackRow[]
>;

/**
 * A looked-up pack entity: flat values (strings) plus any expanded child
 * arrays. Both fetch sources (SPARQL and GraphQL) resolve to this same
 * shape, so rendering, `--format json`, and the MCP envelope are identical
 * downstream regardless of the fetch layer.
 */
export type PackEntity = Record<string, string | readonly PackChildRow[]>;

/** One declarative read story: a noun with its preferred queries. */
export interface StoryPackDefinition {
  /** Command noun (kebab-case), e.g. `"recipe"` → `pragma recipe list`. */
  readonly noun: string;
  /** CLI description for the list command. */
  readonly description?: string;
  /** MCP tool description (defaults to the CLI description). */
  readonly toolDescription?: string;
  readonly list: StoryPackList;
  /** Additional list-shaped verbs beyond `list` (e.g. `categories`). */
  readonly verbs?: readonly StoryPackVerb[];
  readonly lookup?: StoryPackLookup;
}

/** A story definition with the source it came from, for diagnostics. */
export interface StoryPackSource {
  /** Where the definition was declared (config path or package file). */
  readonly source: string;
  readonly definition: StoryPackDefinition;
}
