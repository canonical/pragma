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
  /** Fields to read from each child node. */
  readonly select: readonly StoryPackExpandField[];
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
 * variable to a declared value set.
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
  /** Allowed values; anything else is rejected with INVALID_INPUT. */
  readonly values: readonly string[];
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
}

/**
 * The lookup half of a story pack. The query is generated from `type` and
 * `by` — user-supplied names are escaped by the generator, never
 * interpolated by the author.
 */
export interface StoryPackLookup {
  /** Property whose value names the entity — prefixed name or IRI. */
  readonly by: string;
  /** Optional class constraint — prefixed name or IRI. */
  readonly type?: string;
  /** Inline fields shown under the entity title. */
  readonly fields?: readonly StoryPackField[];
  /** Long-form sections shown after the fields. */
  readonly sections?: readonly StoryPackSection[];
  /** Multi-valued nested projections (pack v1 structured sections). */
  readonly expand?: readonly StoryPackExpand[];
  /** Progressive-disclosure levels; enables the derived `--detail` flag. */
  readonly disclosure?: StoryPackDisclosure;
}

/** One declarative read story: a noun with its preferred queries. */
export interface StoryPackDefinition {
  /** Command noun (kebab-case), e.g. `"recipe"` → `pragma recipe list`. */
  readonly noun: string;
  /** CLI description for the list command. */
  readonly description?: string;
  /** MCP tool description (defaults to the CLI description). */
  readonly toolDescription?: string;
  readonly list: StoryPackList;
  readonly lookup?: StoryPackLookup;
}

/** A story definition with the source it came from, for diagnostics. */
export interface StoryPackSource {
  /** Where the definition was declared (config path or package file). */
  readonly source: string;
  readonly definition: StoryPackDefinition;
}
