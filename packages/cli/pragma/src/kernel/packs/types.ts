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

/**
 * The parameter names the KERNEL puts on a compiled verb, which a story's own
 * filter may therefore not claim.
 *
 * `search` is a story's declared free-text flag; `detail` the disclosure
 * selector; `name` and `count` a lookup's and a sample's positionals; `limit`
 * and `after` the page every list-shaped verb carries. A filter claiming one
 * would collide with a flag the CLI has already registered — a Commander
 * failure outside every error envelope the CLI owns. Declared here, in the
 * zod-free grammar, so the validator that refuses them and any reader that
 * needs to tell a story's OWN params from the kernel's read one list.
 */
export const RESERVED_STORY_PARAMS: readonly string[] = [
  "search",
  "detail",
  "name",
  "count",
  "limit",
  "after",
];

/**
 * The SPARQL VARIABLE prefix the kernel reserves, which a story's own query may
 * therefore not use.
 *
 * The generated filter and search clauses bind a caller's values to variables
 * under this prefix (`?__pragmaFilter0`, `?__pragmaSearch`). A story query using
 * it would have its own variable shadowed, and the symptom would be a filter
 * matching nothing with nothing raised anywhere. Beside the reserved PARAMS for
 * the same reason: the grammar that refuses it and the builder that mints it
 * must read one name, and this file is the zod-free place both can reach — the
 * builder lives behind the dynamically imported run bodies, so nothing on the
 * `--help` fast path may import it.
 */
export const RESERVED_VARIABLE_PREFIX = "__pragma";

/**
 * The `--tier` value that turns the tier scope OFF — every tier, the way every
 * read answered before the scope existed.
 *
 * A word rather than a second flag (this distribution retired an `--all-tiers`
 * once already): `--tier all` answers the same question the flag already asks,
 * so there is one argument to learn and one to document.
 *
 * Declared HERE, in the zod-free grammar, for the reason
 * {@link RESERVED_VARIABLE_PREFIX} is: the compiler that puts the flag on a
 * verb runs on the storeless `--help` fast path, and the run body that reads it
 * lives behind a dynamic import. Both must read one spelling.
 */
export const EVERY_TIER = "all";

/**
 * The parameter name the kernel puts on a TIER-SCOPED noun's reads (`--tier`,
 * `tier` over MCP).
 *
 * Not in {@link RESERVED_STORY_PARAMS}, because it is reserved CONDITIONALLY:
 * an unscoped noun may still declare a `tier` filter of its own, and one does —
 * `variable list --tier` filters the token graph's `dt:tier`, a different
 * predicate in a different namespace from the `ds:tier` this scope reads. The
 * rule that a SCOPED story may not claim it lives in {@link ./storyRules}.
 */
export const TIER_PARAM = "tier";

/**
 * The SELECT variable a list-shaped story publishes its entity IRI in.
 *
 * A convention this package already depends on twice — the condensed renderer
 * titles a row from `uri`/`name`, and every shipped list's IRI column is `uri`
 * — stated here because the tier scope is compiled in as a constraint on that
 * variable, and because both the storeless declaration rules and the query
 * builder behind the dynamic import must read one spelling of it.
 */
export const ENTITY_VARIABLE = "uri";

/**
 * What a cell may say about the values it prints, on a list column, a lookup
 * field or an expand field alike.
 */
export interface PackCellLink {
  /**
   * The noun whose entities this cell NAMES: every value it prints is a name
   * that noun's lookup resolves, so a reader can take the cell to
   * `<noun> lookup` verbatim. On a list column it also promises a filter of
   * the same `noun` over that column.
   */
  readonly noun?: string;
}

/** A list column: a SELECT variable to display. */
export interface PackColumn extends PackCellLink {
  /** SELECT variable name (without `?`). */
  readonly field: string;
  /** Column heading (defaults to the field name). */
  readonly label?: string;
}

/** A looked-up value: an output name bound to a property of the entity. */
export interface PackField extends PackCellLink {
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
  /**
   * One sentence rendered under the section's heading, above its body: how to
   * READ what follows, when the body's own notation does not say.
   *
   * For a section whose body is a document the graph authored, the label is
   * enough. For one whose body is a NOTATION — a block's anatomy is a YAML
   * document in which `background.color: [a, b]` is a fallback chain, first
   * value that resolves winning — the reader has to be told, and the place to
   * tell them is where they are looking.
   */
  readonly note?: string;
}

/** A field read from each child node of a {@link PackExpand}. */
export interface PackExpandField extends PackCellLink {
  /** Output field name on the child record. */
  readonly name: string;
  /** Property to read on the child node — prefixed name, IRI, or path. */
  readonly property: string;
  /** Display label (defaults to the field name). */
  readonly label?: string;
  /** Explicit GraphQL field name (escape hatch). Ignored on the SPARQL path. */
  readonly graphqlField?: string;
  /**
   * Leave the cell BLANK when its value repeats the looked-up entity's own
   * `by` value — for a relation an entity can point back at ITSELF along.
   *
   * The standing case is a block's token bindings: `ds:viaBlock` names the
   * anatomy tree a binding was reached through, and the ontology defines it as
   * present on every record and EQUAL to the block on the block's own tree. So
   * a Button lookup printed "Button" in the via column of all 24 of its rows —
   * a cell that is only ever news when it differs. Blank says "this block's
   * own", which is the reading, and leaves the column carrying only the
   * inherited trees.
   *
   * SPARQL lane only: the generated sub-SELECT can bind the entity's own name
   * and filter against it, and a GraphQL document cannot.
   */
  readonly blankWhenSelf?: true;
  /**
   * The property reaches SEVERAL values per child, and the cell is all of them:
   * distinct, sorted, space-separated, one row per child. Without it each value is a
   * row of its own, repeating every other cell.
   *
   * SPARQL lane only. Not combinable with {@link blankWhenSelf}, and not a
   * name an expand may order by — a set has no order to sort on.
   */
  readonly many?: true;
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
  /**
   * One sentence rendered under the section's heading, above the rows: how to
   * READ them, when the columns do not say it themselves.
   *
   * The same seam a {@link PackSection} carries, for the same reason and
   * through the same renderer field — a section's note was declarable only for
   * a section whose body is one literal, and a TABLE can be the notation that
   * needs reading just as much: a `rank` column is a position in a fallback
   * chain, and nothing in the word "rank" says which chain or that first wins.
   */
  readonly note?: string;
  /**
   * Child field names to ORDER BY in the generated sub-SELECT, in order.
   *
   * Without one an expand's rows arrive in the store's own scan order, which
   * SPARQL does not define and which no reader can predict. That is tolerable
   * for a short list of names and wrong for a TABLE whose rows differ in one
   * column: Button's 24 token bindings came back with `spacing.internal.inline.start`
   * and `…end` adjacent, in no stated order, and a reader comparing two rows
   * had no way to know whether the pair was two facts or one repeated.
   *
   * Names must be fields the `select` declares (the grammar refuses others),
   * so the clause is composed only from validated identifiers. SPARQL lane
   * only — a GraphQL connection's order is the schema's, not the story's.
   */
  readonly orderBy?: readonly string[];
  /**
   * Resolve THIS expand through the SPARQL lane even when the lookup is
   * `source: "graphql"`.
   *
   * The lanes are not interchangeable, and a lookup is one or the other: the
   * GraphQL lane can project a grandchild through a MULTI-valued relation
   * (a nested expand), which the single-hop SPARQL sub-SELECT cannot, and the
   * SPARQL lane can read property paths and any property the ontology defines,
   * which the GraphQL lane cannot — a derived field name that the compiled
   * schema does not carry drops out of the document in silence.
   *
   * The block lookup needs both at once, which is why this exists rather than
   * a second lookup. Its modifier families are a nested expand and so must
   * stay on the GraphQL lane; its token bindings must not, because
   * `anatomy:styleKey` and `anatomy:styleState` — two of the six columns that
   * IDENTIFY a binding — carry no `rdfs:domain`, so ke-graphql generates no
   * field for them on `TokenBinding` and the two columns vanished without a
   * word, leaving rows that differed only in a dropped column looking like
   * duplicates.
   *
   * Only `"sparql"` is admissible: the SPARQL lane is every lookup's default,
   * so an expand opting INTO GraphQL would be asking for a document the lookup
   * never builds.
   */
  readonly source?: "sparql";
}

/**
 * Which lane resolves one expand: its own declared {@link PackExpand.source},
 * else the lookup's, else SPARQL.
 *
 * Read by BOTH lanes — the GraphQL document generator skips what it does not
 * own, and the entity fetcher runs it — so the question is answered in one
 * place rather than asked twice with two spellings.
 */
export function expandIsSparql(
  lookup: Pick<PackLookup, "source">,
  expand: Pick<PackExpand, "source">,
): boolean {
  return (expand.source ?? lookup.source ?? "sparql") === "sparql";
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
 * variable. Filters compile INTO the generated query, as predicates over the
 * author query read as a sub-select — the author's text is never modified, and
 * a caller's value is bound through a `VALUES` block rather than spliced into
 * query text, so filter input still cannot inject SPARQL. Compiling them in is
 * what puts filtering on the right side of a page: a predicate over returned
 * rows would decide over whatever the page happened to contain.
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
  /**
   * How a provided value is compared to the row's cell.
   *
   * `"exact"` (the default) compares the whole cell. `"set"` reads the cell as
   * a SPACE-SEPARATED set and matches when ANY member equals the provided
   * value — the shape a `GROUP_CONCAT` produces, for a dimension where one row
   * legitimately belongs to several values at once. The standing case is a
   * hierarchy: a standard filed under `testing-unit` is, by the definition of
   * the hierarchy, also a `testing` standard, and a filter that compared only
   * the leaf answered `--category testing` with 1 of 8 — a silently wrong
   * answer, exit 0.
   *
   * A `"set"` cell is computed by the author's own `GROUP BY`, so its predicate
   * can only run AFTER aggregation. That is why a filtered list wraps the
   * author query in a sub-select rather than appending to it, and why a
   * filterable story must project its variables by name.
   */
  readonly match?: "exact" | "set";
  /**
   * Where the dimension's VOCABULARY lives in the graph. REQUIRED for a filter
   * with no declared {@link values} — a filter declaring neither is refused.
   *
   * A value-free filter rejects a value the data does not carry. The question is
   * what "the data" means. The rows a list just returned are the wrong answer:
   * they are a POPULATION, and a value can be real while no row carries it — a
   * category the graph declares with zero standards filed under it, a
   * `ds:ConceptType` no concept uses yet. Validating against rows turns those
   * into `INVALID_INPUT`, when the honest answer is a calm empty list.
   *
   * So the vocabulary is read from the graph directly, from the same terms the
   * surface that ENUMERATES it reads (`standard categories` reads `cs:Category`
   * / `cs:slug`; so does the `category` filter's vocabulary query). The ruling
   * this honours is "the graph is the vocabulary, don't hard-code the slugs" —
   * rows were never the graph, just the part of it that answered.
   *
   * A value-free filter USED to fall back to the observed rows — knowingly
   * narrower than the truth, but the only evidence available. Now that a list
   * answers with a PAGE that fallback is not merely narrow, it is wrong: a real
   * value outside the window would be refused as a bad argument, with a
   * truncated list of alternatives. So the fallback is gone and the declaration
   * takes its place — a filter names `values` or a vocabulary, and one that
   * names neither is refused where it is declared.
   */
  readonly vocabulary?: PackFilterVocabulary;
  /**
   * In place of {@link values} or a {@link vocabulary}: a value is a literal
   * name or IRI of that noun (never a pattern), resolved as `<noun> lookup`
   * resolves one, and rows are kept by the IRIs it reaches, matched against
   * {@link entity}.
   */
  readonly noun?: string;
  /**
   * The projected SELECT variable holding the IRI a {@link noun} filter
   * constrains. Left out of the rows unless a column displays it.
   */
  readonly entity?: string;
  /**
   * The path from {@link entity} to the named entity when they are different
   * nodes (`^ex:madeBy` from a row's maker to its widgets); absent, they are one.
   */
  readonly via?: string;
  /** Help text (defaults to a generated description). */
  readonly description?: string;
}

/** The authoritative value set for a value-free {@link PackFilter}. */
export interface PackFilterVocabulary {
  /** SPARQL SELECT producing one row per admissible value. */
  readonly query: string;
  /**
   * SELECT variable carrying the value (without `?`). Defaults to the filter's
   * own {@link PackFilter.variable}.
   */
  readonly variable?: string;
}

/**
 * Free-text search over list rows: a `--search` string keeping a row when ANY
 * named SELECT variable contains the term (case-insensitive substring).
 * Compiled into the generated query alongside the filters, with the term bound
 * through a `VALUES` block rather than spliced into query text.
 */
export interface PackSearch {
  /** SELECT variables searched (without `?`). */
  readonly variables: readonly string[];
  /** Help text (defaults to a generated description). */
  readonly description?: string;
}

/** The shape of a verb path (`sources update`): a noun, optionally a verb — never a command line. */
export const VERB_PATH_PATTERN = /^[a-z][a-z0-9-]*( [a-z][a-z0-9-]*)?$/;

/**
 * A call as a story writes it: a verb path and the params to make it with.
 * Structurally the kernel's `Call` (`spec/types.ts`), restated here because this
 * file is on the distribution config's import graph and may import nothing.
 */
export interface PackCall {
  readonly verb: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

/** Opt-in empty-result recovery for a list story. */
export interface PackEmptyRecovery {
  /** Human-readable cause + fix (e.g. which packages provide the data). */
  readonly message: string;
  /**
   * The call that fixes the emptiness (`{ verb: "sources update" }`). A verb
   * path, never a binary name: the consuming distribution's renderer spells it
   * for the surface it prints on, so a story stays portable across both.
   */
  readonly call?: PackCall;
}

/**
 * What a story half tells a caller choosing between tools. Optional in the
 * grammar, because third-party packs predate it; the distribution's own stories
 * are held to declaring both (`callRule.test.ts`).
 */
export interface PackGuidance {
  /** The question a person would ask, in their words, as a bare clause ("when asked …"). */
  readonly useWhen?: string;
  /** One real call's params (never empty) — the verb is implied, and both spellings derive. */
  readonly example?: Readonly<Record<string, unknown>>;
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
export interface PackVerb extends PackList, PackGuidance {
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
export interface PackSample extends PackGuidance {
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
 * Per-family autocomplete override for a lookup's `<name>` positional. Name
 * completion is DERIVED-BY-DEFAULT from the family's index type; this tunes or
 * opts out of it. Absent means "completion on, engine defaults".
 */
export interface PackCompletion {
  /** `false` opts the family out of name completion (default: on). */
  readonly enabled?: boolean;
  /** Match strategy against the partial (default: substring). */
  readonly match?: "prefix" | "substring" | "fuzzy";
  /** Minimum typed chars before the shell execs completion (default: global). */
  readonly minChars?: number;
}

/**
 * How much an entity's containing SCOPE is worth when a name reaches several
 * entities at once — the ranking factor {@link PackLookup.scopeWeight} declares.
 *
 * DERIVED, never enumerated. The scope's own name is a path (`Global`,
 * `Apps/Launchpad`), so its DEPTH is a fact the graph already states, and a
 * scope nobody has heard of yet inherits its place the day it appears. An
 * enumerated ranking would have to be edited for each new one, and the one
 * nobody edited would silently rank first.
 *
 * The weight falls by {@link falloff} per level below the top, so the top level
 * is worth 1 and each nesting step costs the same again; floored at 0, so a very
 * deep scope can never turn negative and invert the type factor it multiplies.
 *
 * {@link asserted} is the retirement path for the DERIVATION, not for this
 * declaration: an asserted value wins over the derived one
 * (`COALESCE(?asserted, ?derived)`), so the day the ontology states the ranking
 * itself, the depth heuristic stops mattering and `falloff` becomes inert.
 *
 * The declaration itself must stay. Every read of {@link asserted} is reached
 * through this object, so deleting it does not fall back to the ontology's rank
 * — it removes scope ranking from the query altogether and silently returns the
 * lookup to `STR(?uri)` order, which is the defect this exists to fix. What
 * retires is the derivation, and what remains is `via` plus `asserted`.
 */
export interface PackScopeWeight {
  /** The entity → scope edge (e.g. `ds:tier`). */
  readonly via: string;
  /**
   * The scope property holding its path-shaped name (e.g. `ds:name`), whose
   * `/`-separated depth derives the weight.
   *
   * It must be the NAME, not the IRI: the live tiers spell the same scope
   * `ds:apps_launchpad` and `"Apps/Launchpad"`, and only the name carries the
   * separator that makes the hierarchy legible.
   */
  readonly by: string;
  /** Score cost per level below the top, 0–1 (e.g. 0.2 → 1, 0.8, 0.6, …). */
  readonly falloff: number;
  /** An asserted weight on the scope, which WINS over the derived one. */
  readonly asserted?: string;
}

/**
 * The lookup half of a pack. The query is generated from `by` and `type`/`types`
 * — user-supplied names are escaped by the generator, never interpolated by the
 * author. The `source` selects the field-fetch strategy; the name→URI resolve is
 * ALWAYS generated SPARQL regardless of source (an implementation detail, not a
 * second declared source).
 */
export interface PackLookup extends PackGuidance {
  /**
   * Field-fetch strategy (default `"sparql"`). `"graphql"` keeps the SPARQL
   * name→URI resolve, then fetches all fields/sections/expands in ONE generated
   * document executed in-process against the compiled schema. Both sources
   * unwrap to the same flat {@link PackEntity} shape.
   */
  readonly source?: "sparql" | "graphql";
  /** Property whose value names the entity — prefixed name or IRI. */
  readonly by: string;
  /**
   * What names an entity that carries no {@link by} value. Absent (the default)
   * means NOTHING does: the `by` triple is required, and an entity without one
   * is not addressable by name and never drawn by `sample`.
   *
   * `"iri"` opts the family into an IRI-DERIVED name — the local name after the
   * last `#`/`/`, with dot-separated hierarchy segments published as slashes
   * (`cs:react.component.props` → `react/component/props`).
   *
   * DECLARE IT ONLY WHEN THE STORY'S `list` PUBLISHES THE SAME DERIVED NAME.
   * The option exists to keep the two halves of the two-step grammar over ONE
   * population: `standard list` synthesizes a name for the ~87% of code
   * standards carrying no `cs:name`, so `standard lookup` must answer to it.
   * Turning it on where the list does NOT publish such a name is the mirror
   * defect — `token list` requires `ds:tokenId`, so a `ds:Token` without one
   * would become addressable and sampleable under a name the list never
   * published.
   *
   * Requires a class constraint ({@link type}/{@link types}): the derived name
   * is only as trustworthy as the class that vouches for the entity, and
   * without one there is nothing to bound the scan with either.
   */
  readonly nameFallback?: "iri";
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
   * Relative importance per addressed type, prefixed type → 0–1 (unlisted types
   * default to 1). Editorial judgement about which of a noun's classes matters
   * most, declared as DATA rather than frozen into the kernel — it feeds the MCP
   * listing's `annotations.priority`, breaks ties in URI-completion ranking, AND
   * is one factor of the score a name resolve ORDERS BY, so a `ds:Subcomponent`
   * at 0.6 sinks below every component at equal match.
   *
   * A separate map rather than an entry shape on `types` so `types` keeps its
   * flat `readonly string[]` form and the addition is non-breaking. A key naming
   * a type the lookup does not address is REJECTED, not ignored: a silent no-op
   * is how a weight that never applied survives review.
   */
  readonly weights?: Readonly<Record<string, number>>;
  /**
   * The OTHER factor of that score: how much an entity's containing scope is
   * worth, derived from how DEEP that scope sits in its own hierarchy.
   *
   * {@link weights} answers "which KIND of thing did they mean"; this answers
   * "whose?". They multiply rather than tiebreak, because neither subsumes the
   * other: a whole component in a narrow scope still beats a mere part of a
   * block in the widest one.
   */
  readonly scopeWeight?: PackScopeWeight;
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
  /** Autocomplete override for the `<name>` positional (derive-by-default). */
  readonly completion?: PackCompletion;
}

/**
 * The lookup another story's noun declares, by noun — how a {@link PackFilter}
 * naming a `noun` reaches that noun's resolver. A story is compiled alone, so
 * whoever compiles it supplies this over the stories it knows. It may throw a
 * CONFIG_ERROR of its own when it knows why a noun has no lookup.
 */
export type NounLookups = (noun: string) => PackLookup | undefined;

/** A pack list row / flat lookup base: variable name → string value. */
export type PackRow = Record<string, string>;

/**
 * What a list-shaped verb answers with: one page of rows, and whether more
 * follow.
 *
 * The ROWS are still the payload — `formatters.json` projects this to
 * {@link rows} alone, so `--format json` and the MCP tool result stay the bare
 * array they always were and nothing downstream had to learn a new shape. The
 * page's own facts ride the `notice` seam into the envelope's `meta`, the same
 * channel a calm empty result already uses. That is deliberate: a caller
 * reading the data reads data, and a caller who needs to know there is more is
 * told in the one place this surface already puts things the data cannot say
 * about itself.
 */
export interface PackPage {
  /** This page's rows, in the story's own order. */
  readonly rows: readonly PackRow[];
  /**
   * The filters this read was narrowed by, as the caller spelled them — absent
   * when the read was unfiltered.
   *
   * Carried because a zero-row answer has something to say that its rows
   * cannot: which arguments narrowed it. A reader who typed `--kind input` and
   * got nothing has to see that it was applied and came back empty, so the
   * empty-state sentence names the filters in force. The story's
   * `emptyRecovery` — which speaks about the population, and is worded to hold
   * whether or not a filter is in force — prints under that sentence, the same
   * as it prints on its own when nothing narrowed the read. The renderer cannot
   * re-derive this: it sees a page, not the arguments, so the run body records
   * what it narrowed by.
   */
  readonly filters?: readonly PackAppliedFilter[];
  /**
   * The cursor that asks for the rows after this page, absent when this page is
   * the last. Its presence IS the "more rows exist" answer.
   */
  readonly nextAfter?: string;
  /** The limit this page was cut to, for the notice that reports it. */
  readonly limit: number;
  /**
   * The tier scope this read was narrowed to, absent when the story is not
   * tiered or the caller asked for every tier.
   *
   * Carried for the same reason {@link filters} is: the rows cannot say that a
   * whole part of the population was never considered. A reader who sees 175
   * blocks under a heading that says `(175)` reads it as the design system; the
   * scope is how the answer admits it is one tier chain of it.
   */
  readonly scope?: PageTierScope;
}

/** The tier scope a page was read under, as a caller can read it back. */
export interface PageTierScope {
  /**
   * The in-scope tiers, in the spelling the `--tier` flag and the `Tier` column
   * use (the tier IRI's local name), base first and then shallowest first.
   */
  readonly tiers: readonly string[];
  /**
   * Rows of the WHOLE filtered answer per tier, keyed by local name: every
   * in-scope tier (0 when empty), the out-of-scope tiers holding some, and
   * {@link UNTIERED_KEY} for rows in no tier. First page only.
   */
  readonly counts?: Readonly<Record<string, number>>;
}

/** The `counts` key for rows whose entity is in no tier (no tier is named so). */
export const UNTIERED_KEY = "no tier";

/** One filter a list read was narrowed by, as the caller spelled it. */
export interface PackAppliedFilter {
  /** The parameter name (its CLI flag is `--<param>`). */
  readonly param: string;
  /** The value(s) supplied, already joined for display. */
  readonly value: string;
}

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
export interface PackDefinition extends PackGuidance {
  /** Command noun (kebab-case), e.g. `"standard"` → `pragma standard list`. */
  readonly noun: string;
  /** CLI description for the list command. */
  readonly description?: string;
  /** MCP tool description (defaults to the CLI description). */
  readonly toolDescription?: string;
  /**
   * The list story. Optional so a pack can serve a noun that is addressable but
   * not enumerable — a lookup with no list. At least one of `list`/`lookup`
   * must be declared.
   */
  readonly list?: PackList;
  /** Additional list-shaped verbs beyond `list` (e.g. `categories`). */
  readonly verbs?: readonly PackVerb[];
  /** The lookup story. */
  readonly lookup?: PackLookup;
  /**
   * Markdown narrating how this pack's domain is made — its ontology/graph
   * story. Data, like the queries. Surfaced storelessly (off the effective
   * modules) by `pragma colophon`, after pragma's own built-in colophon.
   */
  readonly colophon?: string;
  /**
   * The tier hierarchy this noun's entities carry, which SCOPES every read of
   * them. Absent means unscoped — the read answers from every tier, as every
   * read did before the scope existed.
   */
  readonly tierScope?: PackTierScope;
}

/**
 * The tier hierarchy this noun's entities belong to, and the scope every read
 * of them is narrowed by.
 *
 * DECLARED PER NOUN, because being tiered is a property of the entities: the
 * design system's blocks, modifier families and concepts carry a `ds:tier`, and
 * its token symbols, variables and code standards carry nothing of the kind. A
 * noun that declares this gets the scope compiled into every list it declares
 * and applied to its lookup; a noun that does not is read exactly as before.
 *
 * WHY THE HIERARCHY IS A NAME AND NOT AN EDGE. The shipped graph asserts no
 * parent predicate on a tier — `ds:apps_lxd` is `a ds:Tier` with a
 * `ds:name "Apps/LXD"`, and that slash IS the hierarchy: `Apps/LXD` sits under
 * `Apps`, which sits under nothing. So the parent of a tier is the tier whose
 * name is its own name minus the last `/` segment, exactly the derivation
 * {@link PackScopeWeight} already ranks by ("the depth is the `/` count in the
 * tier's OWN `ds:name`, not in its IRI"). Reading the hierarchy from the same
 * place twice is what keeps the ranking and the scope from disagreeing about
 * which tier is above which. The day a parent edge is asserted upstream, `by`
 * gives way to it and every reader here changes in one place.
 */
export interface PackTierScope {
  /** The class whose instances ARE the tiers (e.g. `ds:Tier`). */
  readonly type: string;
  /** The entity → tier edge (e.g. `ds:tier`), same term as `scopeWeight.via`. */
  readonly via: string;
  /**
   * The tier property holding its path-shaped name (e.g. `ds:name`), whose
   * `/`-separated segments ARE the hierarchy: `Apps/LXD` is a child of `Apps`,
   * and a name with no `/` is top-level.
   */
  readonly by: string;
  /**
   * The tier every other tier builds on, in scope whenever a scope is in force
   * (e.g. `ds:global`).
   *
   * DECLARED, not inferred: nothing in the graph says which of the top-level
   * tiers is the base — the design system's own colophon does ("`global` >
   * `apps` > `apps/lxd`: a lower tier inherits and overrides the blocks of its
   * ancestors"), and that is editorial judgement the ontology has not made yet,
   * so it belongs in the declaration layer beside `weights` and `scopeWeight`.
   * Without it a narrowed read would hide the very blocks the narrow tier
   * inherits: `--tier apps_lxd` would answer with LXD's nine and not the 119
   * global ones every LXD screen is actually built from.
   */
  readonly base?: string;
}

/** A validated pack definition paired with where it was declared. */
export interface PackEntry {
  /** The package story file it came from, e.g. `@acme/recipes/stories/recipe.json`. */
  readonly source: string;
  readonly definition: PackDefinition;
}

/**
 * Which layer declared a story. The label alone cannot answer this — a label is
 * free text for a human — and the difference changes what a failure MEANS.
 *
 * A generated query that names a prefix the graph does not bind is, from a
 * `distribution` story, almost always an unbuilt store: the distribution's own
 * stories and its packs ship together, so the terms exist as soon as anything is
 * built. From a `config` or `package` story it is the opposite: the author named
 * a prefix nothing binds, and no amount of building will conjure it. One is
 * STORE_UNAVAILABLE with a `sources update` recovery, the other a CONFIG_ERROR
 * naming the story — and telling them apart needs this at the failure site.
 */
export type StoryOrigin = "distribution" | "config" | "package";

/**
 * A story's provenance, threaded from where it was declared down to the query
 * that runs on its behalf.
 */
export interface StorySource {
  /** Human-readable location, used verbatim in diagnostics. */
  readonly label: string;
  /** The layer that declared it. */
  readonly origin: StoryOrigin;
}

/** A story the distribution itself declares (`pragma.conf.ts` and its kin). */
export const distributionSource = (label: string): StorySource => ({
  label,
  origin: "distribution",
});
