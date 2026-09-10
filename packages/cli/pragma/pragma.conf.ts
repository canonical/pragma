/**
 * The pragma distribution config — identity, default packs, and the read
 * stories those packs supply.
 *
 * Consumed three times: statically imported by `src/kernel/config/defaults.ts`
 * as the lowest config layer (compiled with the source — no fs), by
 * `src/capabilities/distribution.ts` (which compiles the declared stories into
 * capability modules at module load), and at build time by the bundler. A
 * NON-magic name on purpose: `findProjectConfig` only discovers
 * `pragma.config.{ts,js}`, so this file is never mistaken for a project config.
 * Validated by the same `parseRawConfig` as every layer.
 *
 * INERT DATA. It must never gain a value import: `src/constants.ts` statically
 * imports it to project the program's identity, so anything that runs at this
 * module's load runs on `--help`, `__complete` and `--version`. That also makes
 * the reverse edge impossible — importing `constants.js` from here is a
 * temporal-dead-zone cycle. It is also why no string below names the binary
 * except `name` itself: an `emptyRecovery.cli` is the command WITHOUT the
 * binary name, and the renderer prepends the consuming distribution's.
 * `capabilities/lazy.test.ts` pins both halves of that.
 */

import type { RawConfig } from "./src/kernel/config/types.js";
import type { PackDefinition } from "./src/kernel/packs/types.js";

/**
 * The design-system domain colophon — the ontology + graph story, surfaced by
 * `pragma colophon` after pragma's own. Declared on the flagship UI-block noun
 * because `block` most embodies the design system; it narrates the DOMAIN (what
 * the graph models), not the toolchain (pragma's built-in section).
 */
const DESIGN_SYSTEM_COLOPHON = `The Canonical design system is a **knowledge graph**, not a component library.
Every block, token, modifier, standard, and tier is a node in an RDF store,
described by the \`ds:\` ontology and queried the same way whether you reach it
over GraphQL or raw SPARQL.

## What the graph models

- **Blocks** — components, patterns, layouts, and subcomponents (the \`ds:UIBlock\`
  family). A block carries its anatomy, guidelines, and \`when to use\` / \`when
  not to use\` narrative as graph properties, not prose in a wiki.
- **Modifiers** — families of variant values (\`ds:hasModifierFamily\` →
  \`ds:hasModifier\`) a block composes, so a variant is a relationship, not a
  string.
- **Tokens** — the themeable design values, resolved per theme.
- **Standards** — the do / don't coding guidance, categorized and linked to the
  blocks they govern.
- **Concepts** — the long-form documentation that belongs to no single block:
  foundations, decision guides, and how-to guides, each typed by a
  \`ds:ConceptType\`.
- **Implementations** — which library implements which block, in which
  framework, with a source link pinned to the release that shipped it: the
  spec and the code realizing it are edges in one graph.

## How it fits together

- **Tiers** are a hierarchy (\`global\` > \`apps\` > \`apps/lxd\`): a lower tier
  inherits and overrides the blocks of its ancestors, so scoping a query to a
  tier walks that chain.
- **Channels** (\`normal\`, \`experimental\`, \`prerelease\`) gate visibility, so an
  in-progress block never leaks into a stable answer.

## Why RDF

One graph makes every relationship first-class and queryable: \`block lookup\`
follows edges to modifiers and subcomponents, \`concept lookup\` reads the
long-form documentation, \`graph query\` runs arbitrary SPARQL, and
\`ontology lookup\` reads the schema itself. Which React components implement
a global-tier block is one query, not an afternoon. The store is built once
by \`sources update\` and addressed by content hash, so the domain you query is
exactly the domain that was published.`;

/**
 * The read stories the design-system pack supplies — `block`, `token`,
 * `variable`, `modifier` and `tier` as declared data rather than code.
 *
 * `token` and `variable` read the TOKEN-ONTOLOGY pack's four strata rather than
 * this one's graph, and they are declared here anyway, deliberately: `token
 * consumers` joins a symbol to the design-system records that consume it, so
 * the pair spans both packs and there is no single pack whose `stories/*.json`
 * could carry them. The day the strata are addressable without the design
 * system — or the day either pack ships its own stories — is the day to split
 * them out, and the note below about deletion applies to whichever half moves.
 *
 * The association with the pack is the point: when `@canonical/design-system`
 * starts shipping its own `stories/*.json`, this block is deleted and the
 * package tier takes over with no code change here or anywhere else. The local
 * `readonly PackDefinition[]` annotation is what type-checks them —
 * `PackSource.stories` is deliberately `readonly unknown[]`, because the config
 * layer does not know the pack grammar (`parsePackDefinition` does).
 */
const designSystemStories: readonly PackDefinition[] = [
  // `block list` is declared content (L-OPEN-9): one unfiltered SELECT over
  // the four UIBlock classes, listing ALL blocks — experimental and alpha ones
  // included, for everyone — until filtering returns in declared form. The
  // hand-written tier-chain/channel filtering (and its `--all-tiers` escape)
  // is removed with the code, an owner-signed consequence. Display parity
  // lives IN the query: `VALUES ?class` closes the type set, so the BINDs
  // that derive `name` (declared name, else the IRI's local name), `type`
  // (lowercased class local name), and `tier` (tier IRI's local name) operate
  // over known shapes — the `standard` story's BIND/COALESCE precedent.
  //
  // `block lookup` is served over the GraphQL fetch path (ONE generated document
  // over the `UIBlock` interface covering Component/Pattern/Layout/Subcomponent).
  // Base level mirrors the old summary view (name/tier/summary); the default is
  // `detailed`, matching the old CLI which rendered anatomy and modifiers
  // without a flag. A derived name that maps onto no schema field is omitted
  // (OPTIONAL parity), so a graph missing one of these properties degrades
  // gracefully rather than erroring.
  //
  // That graceful degradation is also how this story went silent: it used to
  // read `ds:whenToUse`/`ds:whenNotToUse`, which the ontology RETIRED in favour
  // of a single `ds:usage` — "Subsumes the former whenToUse/whenNotToUse" is
  // that property's own skos:definition. The shipped pack asserts `ds:usage` on
  // all 264 blocks and neither retired term on any of them, so every
  // `block lookup` on every install rendered no usage narrative at all —
  // silently, because a name that maps onto no schema field is exactly the case
  // OPTIONAL parity swallows. The retired terms are NOT kept as a fallback:
  // `ds:usage` subsumes them, so a pack carrying both would print the same
  // guidance twice, and a declaration no shipped graph can satisfy is
  // untestable by construction — which is what let the silence ship.
  // `block.shipped.exec.test.ts` now holds every graph term declared here — the
  // identity property, fields, sections, expand relations, and every term
  // selected beneath them, walked recursively — to being DEFINED as a property
  // by the SHIPPED ontology. Defined, not asserted, and the difference is the
  // whole point: a term the ontology never defines is a story bug that can
  // never render, on any block, on any install — this defect. A term it defines
  // that no instance asserts yet (`ds:figmaLink` today) is a content gap
  // upstream, which the OPTIONAL parity above degrades over gracefully and
  // which this pack has no business failing on. `ds:usage` alone is ALSO held
  // to being asserted, on every block, because its absence is what shipped.
  //
  // Disclosure declares the FULL canonical ladder `[summary, standard,
  // detailed]` — the same set `standard` declares — so a config
  // `detail=standard` names a level `block` advertises rather than one it
  // silently accepts-then-degrades. Block carries no `standard`-tier content of
  // its own; gating is by canonical index, so `standard` resolves to the base
  // view. Only the level SET is aligned: the per-noun DEFAULT stays domain-tuned
  // (`block` rich-by-default, `standard` terse-by-default).
  {
    noun: "block",
    description: "List all design system blocks.",
    toolDescription:
      "List all design system blocks with their type, tier, and modifier families. Use when browsing which blocks exist. Example: block_list {}.",
    colophon: DESIGN_SYSTEM_COLOPHON,
    list: {
      query: [
        "SELECT ?uri ?name ?type ?tier",
        '       (GROUP_CONCAT(DISTINCT ?modName; separator=", ") AS ?modifiers)',
        "WHERE {",
        "  VALUES ?class { ds:Component ds:Pattern ds:Layout ds:Subcomponent }",
        "  ?uri a ?class .",
        "  OPTIONAL { ?uri ds:name ?dsName }",
        "  OPTIONAL { ?uri ds:tier ?tierUri . OPTIONAL { ?tierUri ds:name ?tierName } }",
        "  OPTIONAL { ?uri ds:hasModifierFamily ?family . ?family ds:name ?modName }",
        '  BIND(COALESCE(?dsName, REPLACE(STR(?uri), "^.*[/#]", "")) AS ?name)',
        '  BIND(LCASE(REPLACE(STR(?class), "^.*[/#]", "")) AS ?type)',
        '  BIND(REPLACE(STR(?tierUri), "^.*[/#]", "") AS ?tier)',
        // `ORDER BY ?name` alone is not a total order, and 25 names here are
        // shared by two or three blocks. SPARQL says nothing about tied rows,
        // so the store's scan decided: ONE run gave `Button` launchpad-first
        // and `CheckboxInput` global-first. Tier depth, then `STR(?uri)`,
        // makes it total — the shallower tier leads its name group, and equal
        // depths fall back to a key that cannot tie.
        //
        // The depth is the same one `lookup` ranks by, spelled out because a
        // list query is declared TEXT the kernel does not compose. Only the
        // depth: a browse ordered by NAME is not the place to re-litigate which
        // block the name MEANS (that is `lookup`'s ranking, which also weighs
        // the block's type), and every row here already prints its own type.
        //
        // The depth-0 IF is the store's, not style: oxigraph raises on
        // `0.2 * 0`, and a raising BIND leaves `?tierRank` unbound — which is
        // exactly how a top-tier block silently sorted last (see
        // `sparqlProduct` in kernel/packs/sparql/buildLookupQuery.ts).
        '  BIND(STRLEN(?tierName) - STRLEN(REPLACE(?tierName, "/", "")) AS ?tierDepth)',
        "  BIND(COALESCE(IF(?tierDepth = 0, 1, 1 - (0.2 * ?tierDepth)), 0) AS ?tierRank)",
        "}",
        "GROUP BY ?uri ?name ?type ?tier ?tierRank",
        "ORDER BY ?name DESC(?tierRank) STR(?uri)",
      ].join("\n"),
      columns: [
        { field: "name", label: "Name" },
        { field: "type", label: "Type" },
        { field: "tier", label: "Tier" },
        { field: "modifiers", label: "Modifiers" },
        { field: "uri", label: "IRI" },
      ],
      emptyRecovery: {
        message:
          "No blocks in the store. Build it from the configured design-system packs.",
        cli: "sources update",
      },
    },
    lookup: {
      source: "graphql",
      toolDescription:
        'Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. Use when you need the full spec of specific blocks by name — detail: "summary" trims to the base view. Example: block_lookup { name: ["Button"] }.',
      by: "ds:name",
      types: ["ds:Component", "ds:Pattern", "ds:Layout", "ds:Subcomponent"],
      // A subcomponent is a PART of a block, never the block someone means:
      // for the query "button" the 86 `…-close_button` subcomponents used to
      // outrank `ds:global.component.button` on the alphabet alone. Weighting
      // them below 1 sinks every one of them under every component at equal
      // match score, lowers their `annotations.priority` in the resource
      // listing, and — since a name resolve now RANKS rather than picks — sorts
      // them under every component a shared name also reaches.
      weights: { "ds:Subcomponent": 0.6 },
      // The other half of that judgement, and the reason it is a PRODUCT and
      // not a tiebreak. 25 live block names are shared by two or three blocks
      // across tiers, and `weights` alone cannot separate two components; the
      // alphabet decided, so `Button` answered with Launchpad's and never
      // mentioned the global one. A tier's DEPTH is what ranks it: `Global` is
      // depth 1 and worth 1, `Apps/Launchpad` is depth 2 and worth 0.8, so
      //
      //   Button    global component 1 × 1   >  launchpad component 1 × 0.8
      //   TextInput global SUBcomponent 0.6 × 1  <  launchpad component 1 × 0.8
      //
      // — the global block wins where both are whole blocks, and the editorial
      // rule that a whole component beats a part survives the addition. A pure
      // tier tiebreak would have inverted the second case.
      //
      // DERIVED, never enumerated: the depth is the `/` count in the tier's
      // OWN `ds:name` (`"Apps/Launchpad"`), not in its IRI (`ds:apps_launchpad`
      // — the slash exists only in the name), so a tier added upstream tomorrow
      // is ranked correctly without editing anything here.
      //
      // Declared as DATA beside `weights` for the same reason `weights` is:
      // editorial judgement the ontology has not yet made belongs in the config
      // layer, which "wins every harvest" when upstream is silent. `asserted`
      // is the exit: the day `ds:tierRank` is asserted upstream it takes
      // precedence over the derived depth (`COALESCE`), and this whole entry is
      // deleted with no code change.
      scopeWeight: {
        via: "ds:tier",
        by: "ds:name",
        falloff: 0.2,
        asserted: "ds:tierRank",
      },
      graphqlType: "UIBlock",
      fields: [
        { name: "tier", property: "ds:tier", label: "Tier" },
        {
          name: "figmaLink",
          property: "ds:figmaLink",
          label: "Figma",
          level: "detailed",
        },
      ],
      sections: [
        { name: "summary", property: "ds:summary", label: "Summary" },
        // ONE section, because `ds:usage` is ONE property: its literal is
        // free-text Markdown carrying its own `### When to use` / `### When not
        // to use` sub-sections (78 and 71 of the 126 non-empty ones do), so
        // splitting it back into two headings here would mean parsing prose the
        // graph deliberately keeps whole. The renderer demotes a body's own ATX
        // headings below the section heading, so those sub-sections nest UNDER
        // `### Usage` instead of colliding with it. Half the blocks assert an
        // EMPTY `ds:usage` (138 of 264); the renderer skips empty sections, so
        // those print no heading rather than an empty one.
        {
          name: "usage",
          property: "ds:usage",
          label: "Usage",
          level: "detailed",
        },
        {
          name: "guidelines",
          property: "ds:guidelines",
          label: "Guidelines",
          level: "detailed",
        },
        {
          name: "anatomyDsl",
          property: "ds:anatomyDsl",
          label: "Anatomy (DSL)",
          kind: "code",
          level: "detailed",
        },
        {
          name: "anatomyClassic",
          property: "ds:anatomyClassic",
          label: "Anatomy (classic)",
          kind: "code",
          level: "detailed",
        },
      ],
      expand: [
        {
          name: "modifierFamilies",
          heading: "Modifier Families",
          relation: "ds:hasModifierFamily",
          level: "detailed",
          select: [
            { name: "name", property: "ds:name" },
            {
              name: "values",
              relation: "ds:hasModifier",
              select: [{ name: "name", property: "ds:name" }],
            },
          ],
        },
        {
          name: "properties",
          heading: "Properties",
          relation: "ds:hasProperty",
          kind: "table",
          level: "detailed",
          select: [
            { name: "name", property: "ds:name" },
            { name: "type", property: "ds:propertyType" },
            { name: "optional", property: "ds:optional" },
          ],
        },
        {
          name: "subcomponents",
          heading: "Subcomponents",
          relation: "ds:hasSubcomponent",
          level: "detailed",
          select: [
            { name: "name", property: "ds:name" },
            { name: "uri", property: "ds:name", graphqlField: "uri" },
          ],
        },
      ],
      disclosure: {
        levels: ["summary", "standard", "detailed"],
        default: "detailed",
      },
      sample: {
        fixedCount: true,
        toolDescription:
          "Return randomly selected complete design-system blocks as exemplars. Use BEFORE writing queries to see actual data shapes, anatomy, and property names. Example: block_sample {}.",
      },
    },
  },

  // The design-token SYMBOLS — S1 of the four token strata, keyed on the name
  // literal the binding programme publishes.
  //
  // REPOINTED from `ds:Token`, a class no graph asserts. The shipped pack
  // carries 0 instances of it and 745 `dt:TokenSymbol`, so every `token list`
  // on every install answered an empty table while the population sat one
  // namespace over — the same silent shape as reading a retired `ds:whenToUse`,
  // and caught the same way (`listBudget.shipped.exec.test.ts` measured this
  // story at 0 rows / 2 bytes). `ds:valueLight`/`ds:valueDark` go with it: a
  // symbol's value is not a pair of theme columns but one row per POSITION in
  // the coordinate space, which is what `token values` answers.
  //
  // NO `nameFallback`, deliberately. The kernel's IRI derivation publishes a
  // dotted local name with SLASHES (`dt:color.text` → `color/text`), which
  // contradicts the dotted notation ruled for symbol names and would make this
  // answer disagree with the anatomy's spelling of the same symbol. The
  // consequence is visible rather than hidden: until the pack ships
  // `rdfs:label` on the symbols, `token list` publishes no rows and
  // `token lookup` resolves no name. An empty answer that says so beats a
  // populated one whose names nothing else recognises — and it is why `token`
  // is still in `EMPTY_CORPUS_TODAY`.
  {
    noun: "token",
    description: "List the design-token symbols.",
    toolDescription:
      'List the design-token SYMBOLS — logical dotted names (`color.text`), with the type and description every definition of that symbol agrees on, and the symbol a channel provisions. Platform names like `--color-text` are variable_list. Example: token_list { type: "color" }.',
    list: {
      // Type and description are DEFINITION-level facts, and 393 of the 745
      // symbols have more than one definition (`color.text` has 20). The
      // AGREEMENT RULE decides which reaches the row: a value is published when
      // every definition of that symbol agrees on it, and left blank when they
      // disagree. That is one fact and one rule, and it lives HERE — in the
      // query — because a formatter cannot see the population it would have to
      // judge, and because the same rule has to hold for the documentation
      // projection reading the same graph.
      //
      // `COUNT(DISTINCT ...) = 1` is the whole rule; `MIN` then names the one
      // value there is, and is preferred to `SAMPLE` because it ignores an
      // unbound row rather than being free to return it. A symbol with NO
      // definition at all (the 25 minted channels) counts 0, not 1, so it
      // blanks too — absence and disagreement both answer blank, which is the
      // honest reading of "no value every definition agrees on".
      //
      // Measured over the 745 symbols: the agreement rule blanks 40
      // descriptions by disagreement and 0 types, plus 25 of each by absence.
      // The rejected alternative — prefer the mode file — blanks BOTH fields
      // for 391 of them, every primitive included, so `token list --type color`
      // could not have returned a single palette symbol.
      query: [
        "SELECT ?uri ?name ?type ?description ?channelOf",
        "WHERE {",
        "  ?uri a dt:TokenSymbol ;",
        "       rdfs:label ?name .",
        // A channel IS a symbol after the binding programme, so the relation to
        // the symbol it provisions is a column on this population rather than a
        // noun of its own. Bound to the base symbol's LABEL, not its IRI: the
        // filter column and the displayed column are one column, and an
        // unbound IRI cell renders as a full IRI.
        "  OPTIONAL { ?uri dt:channelOf/rdfs:label ?channelOf }",
        "  {",
        "    SELECT ?uri",
        '           (IF(COUNT(DISTINCT ?definedType) = 1, MIN(?typeLabel), "") AS ?type)',
        '           (IF(COUNT(DISTINCT ?definedDescription) = 1, MIN(?definedDescription), "") AS ?description)',
        "    WHERE {",
        "      ?uri a dt:TokenSymbol .",
        "      OPTIONAL {",
        "        ?definition dt:symbol ?uri .",
        "        OPTIONAL {",
        "          ?definition dt:tokenType ?definedType .",
        "          ?definedType rdfs:label ?typeLabel .",
        "        }",
        "        OPTIONAL { ?definition w3c-tokens:description ?definedDescription }",
        "      }",
        "    }",
        "    GROUP BY ?uri",
        "  }",
        "}",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "name", label: "Name" },
        { field: "type", label: "Type" },
        { field: "channelOf", label: "Channel of" },
        { field: "description", label: "Description" },
        { field: "uri", label: "IRI" },
      ],
      filters: [
        {
          param: "type",
          variable: "type",
          // The seven typed members of the definition's type class, which is
          // the same term the `type` column reads through its definitions. A
          // type the ontology declares that no symbol is filed under is a calm
          // empty list, not a bad argument.
          vocabulary: {
            query: [
              "SELECT DISTINCT ?type WHERE {",
              "  ?kind a w3c-tokens:TokenType ;",
              "        rdfs:label ?type .",
              "}",
            ].join("\n"),
          },
          description: "Filter by the agreed type.",
        },
        {
          param: "channelOf",
          variable: "channelOf",
          // The dimension is "which SYMBOL", so the roster is EVERY symbol —
          // not the far smaller set that happens to have a channel today.
          // Asking for a symbol nothing provisions is the documented calm empty
          // list, which is the whole reason a vocabulary is read from the graph
          // rather than from the rows a page returned.
          //
          // Keyed on `rdfs:label`, the same term the column binds and the same
          // term the lookup resolves by. All three move together or not at all.
          vocabulary: {
            query: [
              "SELECT DISTINCT ?channelOf WHERE {",
              "  ?symbol a dt:TokenSymbol ;",
              "          rdfs:label ?channelOf .",
              "}",
            ].join("\n"),
          },
          description: "Filter to the channels of one symbol.",
        },
      ],
      search: {
        variables: ["name", "description"],
        description: "Search in name and description.",
      },
      emptyRecovery: {
        message:
          "No token symbols in the store. The @canonical/token-ontology pack provides them, and a symbol is only addressable once that pack publishes its name literals.",
        cli: "sources update",
      },
    },
    verbs: [
      {
        verb: "values",
        description:
          "List the value each symbol resolves to at each position, with its chain or its derivation.",
        toolDescription:
          'List the resolved token VALUES — one row per (symbol, position) the graph materialises, with the value and either its resolution chain or the symbol it derives from. Only MATERIALISED positions appear, not the permutation space: a position with no row falls through to the base symbol. A derived row carries a derivation and no value cell. Example: token_values { symbol: "color.text" }.',
        // The resolved-value shape admits exactly one of a chain or a
        // derivation, so BOTH are selected wherever a value is projected. A
        // surface that selected only the chain would show a blank row for every
        // one of the 165 channel routings — and channel values are precisely
        // what the anatomy validator and the editor's completion ask about.
        //
        // Both are rdf:LISTs, not literals: `dt:resolutionChain` is a list of
        // definition IRIs, so it needs `/rdf:rest*/rdf:first` and an aggregate
        // to become one cell. The chain items are trimmed to the path inside
        // the token files, which is the form the resolution chain is quoted in.
        query: [
          "SELECT ?symbol ?position ?value ?derivedFrom",
          '       (GROUP_CONCAT(DISTINCT ?chainItem; SEPARATOR=" ") AS ?chain)',
          "WHERE {",
          "  ?resolved a dt:ResolvedValue ;",
          "            dt:forSymbol ?symbolUri .",
          "  ?symbolUri rdfs:label ?symbol .",
          "  OPTIONAL { ?resolved dt:coordinate ?coordinate }",
          "  OPTIONAL { ?resolved dt:resolvesTo ?value }",
          "  OPTIONAL { ?resolved dt:derivedFrom/rdfs:label ?derivedFrom }",
          "  OPTIONAL {",
          "    ?resolved dt:resolutionChain/rdf:rest*/rdf:first ?chainUri .",
          '    BIND(REPLACE(STR(?chainUri), "^.*/file/", "") AS ?chainItem)',
          "  }",
          // The coordinate's own dotted name, with the class prefix its IRI
          // carries dropped: `dt:coordinate.mode.dark` displays and filters as
          // `mode.dark`, which is how a position is written everywhere else.
          // A value at the DEFAULT position carries no coordinate at all, and
          // its cell is empty rather than a full IRI.
          '  BIND(REPLACE(REPLACE(STR(?coordinate), "^.*[/#]", ""), "^coordinate[.]", "") AS ?position)',
          "}",
          "GROUP BY ?resolved ?symbol ?position ?value ?derivedFrom",
          "ORDER BY ?symbol ?position",
        ].join("\n"),
        columns: [
          { field: "symbol", label: "Symbol" },
          { field: "position", label: "Position" },
          { field: "value", label: "Value" },
          { field: "chain", label: "Chain" },
          { field: "derivedFrom", label: "Derived from" },
        ],
        filters: [
          {
            param: "symbol",
            variable: "symbol",
            vocabulary: {
              query: [
                "SELECT DISTINCT ?symbol WHERE {",
                "  ?s a dt:TokenSymbol ;",
                "     rdfs:label ?symbol .",
                "}",
              ].join("\n"),
            },
            description: "Filter to one symbol.",
          },
          {
            param: "position",
            variable: "position",
            // `set`, because ONE row can sit at several positions at once: a
            // value asserted `dt:alsoAt` a second coordinate is one row
            // belonging to both, and a filter comparing only the whole cell
            // would answer such a row for neither.
            match: "set",
            vocabulary: {
              query: [
                "SELECT DISTINCT ?position WHERE {",
                "  ?c a dt:Coordinate .",
                '  BIND(REPLACE(REPLACE(STR(?c), "^.*[/#]", ""), "^coordinate[.]", "") AS ?position)',
                "}",
              ].join("\n"),
            },
            description: "Filter to one position (e.g. mode.dark).",
          },
        ],
        search: {
          variables: ["symbol", "value", "derivedFrom"],
          description: "Search symbol, value, derivation.",
        },
        emptyRecovery: {
          message:
            "No resolved token values in the store. The @canonical/token-ontology pack provides them, and a value is only addressable by symbol once that pack publishes its name literals.",
          cli: "sources update",
        },
      },
      {
        verb: "consumers",
        description:
          "List which blocks consume which token symbol, at which style key, state and rank.",
        toolDescription:
          'List the token BINDINGS the design system records — which block consumes which symbol, at which style key, state, rank and anatomy node. Every column is identity: two bindings differing only in state or rank are different facts. Answers empty until the design-system packs record bindings. Example: token_consumers { symbol: "color.text" }.',
        // Seven identity columns, and not one of them is decoration: a binding
        // is identified by the whole tuple, so dropping `rank` or `node` would
        // publish rows a caller cannot tell apart — which is worse than a wide
        // table, because a deduplicating consumer would silently lose facts.
        //
        // `ds:hasTokenBinding` and its four siblings are DEFINED BY the
        // design-system ontology only from the binding programme's records
        // onward; today the shipped ontology defines none of them, and the `ds:`
        // prefix IS bound, so this answers a calm empty list with the recovery
        // below rather than failing. It starts answering with no code change.
        query: [
          "SELECT ?block ?symbol ?key ?state ?rank ?node ?uri",
          "WHERE {",
          "  ?blockUri ds:hasTokenBinding ?uri .",
          "  ?uri ds:consumesSymbol ?symbolUri .",
          "  ?symbolUri rdfs:label ?symbol .",
          "  OPTIONAL { ?uri anatomy:styleKey ?key }",
          "  OPTIONAL { ?uri anatomy:styleState ?state }",
          "  OPTIONAL { ?uri ds:rank ?rank }",
          "  OPTIONAL { ?uri ds:node ?node }",
          "  OPTIONAL { ?uri ds:viaBlock ?viaUri . OPTIONAL { ?viaUri ds:name ?viaName } }",
          "  OPTIONAL { ?blockUri ds:name ?blockName }",
          '  BIND(COALESCE(?viaName, ?blockName, REPLACE(STR(?blockUri), "^.*[/#]", "")) AS ?block)',
          "}",
          "ORDER BY ?block ?symbol ?key ?state ?rank ?node",
        ].join("\n"),
        columns: [
          { field: "block", label: "Block" },
          { field: "symbol", label: "Symbol" },
          { field: "key", label: "Style key" },
          { field: "state", label: "State" },
          { field: "rank", label: "Rank" },
          { field: "node", label: "Node" },
          { field: "uri", label: "IRI" },
        ],
        filters: [
          {
            param: "symbol",
            variable: "symbol",
            vocabulary: {
              query: [
                "SELECT DISTINCT ?symbol WHERE {",
                "  ?s a dt:TokenSymbol ;",
                "     rdfs:label ?symbol .",
                "}",
              ].join("\n"),
            },
            description: "Filter to one symbol.",
          },
          {
            param: "key",
            variable: "key",
            // The style-key REGISTRY, which the anatomy pack publishes as 111
            // `anatomy:StyleKey` individuals. Their identity is the IRI and
            // they carry no key literal, so the admissible spelling is the
            // IRI's local name with the class prefix its minting adds dropped:
            // `anatomy:key.appearance.background` is the key
            // `appearance.background`, which is how the vocabulary's own
            // examples write it.
            //
            // Read from the REGISTRY rather than from the records, and that is
            // the point: no block has a binding record yet, so a roster read
            // from records would be empty and would refuse every key a caller
            // could legitimately ask about. The registry is the graph's
            // statement of what a key may be; the records are the population.
            vocabulary: {
              query: [
                "SELECT DISTINCT ?key WHERE {",
                "  ?styleKey a anatomy:StyleKey .",
                '  BIND(REPLACE(REPLACE(STR(?styleKey), "^.*[/#]", ""), "^key[.]", "") AS ?key)',
                "}",
              ].join("\n"),
            },
            description:
              "Filter to one style key (e.g. appearance.background).",
          },
          {
            param: "state",
            variable: "state",
            // The closed interaction-state vocabulary, read from the shape that
            // closes it rather than transcribed here: the anatomy pack's shapes
            // constrain `anatomy:styleState` with an `sh:in` list, so the five
            // admissible states are a query over that list. Hard-coding them
            // would be the "don't hard-code the slugs" defect with an extra
            // step — the graph already says it.
            vocabulary: {
              query: [
                "SELECT DISTINCT ?state WHERE {",
                "  ?shape sh:path anatomy:styleState ;",
                "         sh:in/rdf:rest*/rdf:first ?state .",
                "}",
              ].join("\n"),
            },
            description:
              "Filter to one interaction state (hover, focus, active, selected, disabled).",
          },
        ],
        search: {
          variables: ["block", "symbol", "key", "state", "node"],
          description: "Search block, symbol, key, state, node.",
        },
        // Deliberately `sources update`: unlike `standard list`, this story's
        // data does NOT ride the embedded snapshot — the binding records are
        // written by the design-system packs, so an empty answer here really is
        // a store that predates them.
        emptyRecovery: {
          message:
            "No token bindings in the store. The design-system packs record which block consumes which symbol; a store built before they did carries none.",
          cli: "sources update",
        },
      },
    ],
    lookup: {
      source: "sparql",
      // `rdfs:label`, matching the `name` the list publishes — the two-step
      // grammar is that a row's `name` goes VERBATIM to lookup. Both halves
      // REQUIRE the literal, so both are empty together rather than one
      // publishing names the other cannot resolve.
      by: "rdfs:label",
      type: "dt:TokenSymbol",
      description:
        "Look up one or more token symbols by dotted name, IRI, or glob.",
      toolDescription:
        'Get one design-token symbol in full: every definition behind it with that definition\'s own type and description, the modifier families that may rebind it, and the value it resolves to at each position. Address it by the dotted name token_list publishes (`color.text`), by prefixed name, by IRI, or by a glob. Example: token_lookup { name: ["color.text"] }.',
      fields: [
        // Single-valued: a channel provisions exactly one symbol.
        {
          name: "channelOf",
          property: "dt:channelOf/rdfs:label",
          label: "Channel of",
        },
      ],
      // A symbol-level `type` and `description` are deliberately NOT fields
      // here. A lookup field is a property PATH, and the path from a symbol to
      // its definitions' types is multi-valued — 20 rows for `color.text` — of
      // which the resolver keeps the first. That is exactly the "sample one
      // definition" the agreement rule exists to refuse, and a path cannot
      // express `COUNT(DISTINCT ...) = 1`. So the agreed pair is published
      // where a query can judge it (`token list`, and `--search <name>` to
      // reach one symbol), and the `definitions` expand — which CAN show the
      // definitions apart — carries each definition's own.
      expand: [
        {
          name: "definitions",
          heading: "Definitions",
          kind: "table",
          // The inverse edge: definitions point AT the symbol
          // (`?definition dt:symbol ?uri`), so the relation from the symbol is
          // `^dt:symbol`. 1,311 definitions stand behind 745 symbols.
          relation: "^dt:symbol",
          select: [
            { name: "file", property: "w3c-tokens:inFile/w3c-tokens:path" },
            { name: "type", property: "dt:tokenType/rdfs:label" },
            { name: "description", property: "w3c-tokens:description" },
          ],
        },
        {
          name: "coverage",
          heading: "Covered by",
          // Coverage hangs on the FAMILY, not on the symbol
          // (`?family dt:covers ?symbol`), so this is the inverse too. The
          // family is a `ds:` entity, so its name comes from the
          // design-system pack rather than the token ontology.
          relation: "^dt:covers",
          select: [{ name: "family", property: "ds:name" }],
        },
        {
          name: "values",
          heading: "Values",
          kind: "table",
          relation: "^dt:forSymbol",
          // BOTH the chain and the derivation, for the reason `token values`
          // states: the shape admits exactly one of them, and selecting only
          // the chain would blank every channel routing.
          //
          // `rdf:first` and NOT `/rdf:rest*/rdf:first`, which is the walk
          // `token values` uses. An expand's child field is a plain triple with
          // no aggregate available, so a multi-hop chain multiplies the CHILD:
          // 204 of the 1,072 values carry a chain of 2 or 3 links, and
          // `color.background.container` rendered four "Values" rows for its
          // two positions, each repeating the same value beside a different
          // link. A caller counting positions would have read that as four.
          // The head of the list is the definition the value was AUTHORED in
          // (the tail is what it aliased through to a primitive), so one link
          // per row is both correct and the most useful one; the full walk is
          // `token values`, which can GROUP_CONCAT it into a single cell.
          select: [
            { name: "position", property: "dt:coordinate" },
            { name: "value", property: "dt:resolvesTo" },
            { name: "chain", property: "dt:resolutionChain/rdf:first" },
            { name: "derivedFrom", property: "dt:derivedFrom/rdfs:label" },
          ],
        },
      ],
      sample: {
        fixedCount: true,
        toolDescription:
          "Return random complete design-token symbols — definitions, coverage and resolved values — as exemplars. Use BEFORE writing queries to see real data shapes. Example: token_sample {}.",
      },
    },
  },

  // The platform VARIABLES — S4, the stylesheet's own names for the values.
  //
  // A SECOND noun rather than a flag on `token`, and one measurement settles
  // it: 236 of the 1,156 variables stand for NO symbol at all — legacy twins
  // the ontology itself names, plus the computed states and resets.
  // `--disabled--color-text` and `--modifier-color-text` are nobody's symbol, so
  // a surface keyed on symbols cannot address them. The cut is by STRATUM ROLE,
  // not by platform: the platform is read out of the IRI base as an ordinary
  // filter, so a second platform's catalogue arrives as one more value of
  // `--platform` and not as a noun of its own.
  //
  // The published name is the label with its leading `--` STRIPPED, and that is
  // what makes the noun usable at all: `--color-text` cannot be typed as a
  // positional argument — the parser answers `unknown option '--color-text'`
  // and a glob is no escape. Upstream publishes the stripped form as
  // `rdfs:label`, and the stripping is measurably safe: over the 1,156
  // variables it produces 1,156 distinct names and collides with no symbol
  // name. `variable.parity.test.ts` pins both halves.
  {
    noun: "variable",
    description:
      "List the platform variables the design tokens are emitted as.",
    toolDescription:
      'List the platform VARIABLES a stylesheet declares (`--color-text`), with the symbol each stands for, its tier, visibility and the coordinates it is selected at. 236 stand for no symbol, so token_list cannot reach them. Address one WITHOUT its leading dashes (`color-text`). Example: variable_list { symbol: "color.text" }.',
    list: {
      query: [
        "SELECT ?uri ?name ?platform ?symbol ?tier ?visibility",
        '       (GROUP_CONCAT(DISTINCT ?coordinateName; SEPARATOR=" ") AS ?coordinate)',
        "WHERE {",
        "  ?uri a dt:Variable ;",
        "       rdfs:label ?name .",
        "  OPTIONAL { ?uri dt:ofSymbol/rdfs:label ?symbol }",
        "  OPTIONAL { ?uri dt:tier ?tierUri }",
        "  OPTIONAL { ?uri dt:visibility ?visibilityUri }",
        // A variable is selected at a coordinate two ways, and both count: the
        // CONDITION its declaration sits under selects one
        // (`.success` → `criticality.success`), and a declaration may assert a
        // second directly (`dt:alsoAt`, which is `mode.dark` for all 261 of
        // them). 305 of the 1,156 variables reach at least one coordinate.
        "  OPTIONAL {",
        "    { ?uri dt:declaredAt/dt:under/dt:selectsCoordinate ?coordinateUri }",
        "    UNION",
        "    { ?uri dt:declaredAt/dt:alsoAt ?coordinateUri }",
        '    BIND(REPLACE(REPLACE(STR(?coordinateUri), "^.*[/#]", ""), "^coordinate[.]", "") AS ?coordinateName)',
        "  }",
        // The platform, read out of the IRI base rather than asserted: every
        // variable is minted under `…/s4/<platform>/`. STRAFTER/STRBEFORE
        // rather than a regex so a variable whose IRI carries no such segment
        // answers an EMPTY cell instead of its own full IRI, which is what a
        // failed REPLACE returns.
        '  BIND(STRBEFORE(STRAFTER(STR(?uri), "/s4/"), "/") AS ?platform)',
        '  BIND(REPLACE(REPLACE(STR(?tierUri), "^.*[/#]", ""), "^tier[.]", "") AS ?tier)',
        '  BIND(REPLACE(REPLACE(STR(?visibilityUri), "^.*[/#]", ""), "^visibility[.]", "") AS ?visibility)',
        "}",
        "GROUP BY ?uri ?name ?platform ?symbol ?tier ?visibility",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "name", label: "Name" },
        { field: "symbol", label: "Symbol" },
        { field: "tier", label: "Tier" },
        { field: "visibility", label: "Visibility" },
        { field: "platform", label: "Platform" },
        { field: "coordinate", label: "Coordinates" },
        { field: "uri", label: "IRI" },
      ],
      filters: [
        {
          param: "platform",
          variable: "platform",
          // The vocabulary is a query over the IRI base, exactly as the column
          // is — the platform is not asserted anywhere, so the file identity
          // in the IRI is the only thing that states it. One value today
          // (`web`); a second platform's catalogue adds itself here with no
          // edit.
          vocabulary: {
            query: [
              "SELECT DISTINCT ?platform WHERE {",
              "  ?v a dt:Variable .",
              '  BIND(STRBEFORE(STRAFTER(STR(?v), "/s4/"), "/") AS ?platform)',
              "}",
            ].join("\n"),
          },
          description: "Filter by platform.",
        },
        {
          param: "symbol",
          variable: "symbol",
          // The symbol roster, read the same way `token list`'s `channelOf`
          // filter reads it: every symbol, keyed on `rdfs:label`.
          vocabulary: {
            query: [
              "SELECT DISTINCT ?symbol WHERE {",
              "  ?s a dt:TokenSymbol ;",
              "     rdfs:label ?symbol .",
              "}",
            ].join("\n"),
          },
          description: "Filter to one symbol.",
        },
        {
          param: "tier",
          variable: "tier",
          vocabulary: {
            query: [
              "SELECT DISTINCT ?tier WHERE {",
              "  ?t a dt:Tier .",
              '  BIND(REPLACE(REPLACE(STR(?t), "^.*[/#]", ""), "^tier[.]", "") AS ?tier)',
              "}",
            ].join("\n"),
          },
          description: "Filter by tier (primitive, semantic, derived).",
        },
        {
          param: "visibility",
          variable: "visibility",
          vocabulary: {
            query: [
              "SELECT DISTINCT ?visibility WHERE {",
              "  ?v a dt:Visibility .",
              '  BIND(REPLACE(REPLACE(STR(?v), "^.*[/#]", ""), "^visibility[.]", "") AS ?visibility)',
              "}",
            ].join("\n"),
          },
          description: "Filter by visibility (public, internal).",
        },
        {
          param: "coordinate",
          variable: "coordinate",
          // `set`, and it has to be: `--modifier-color-text` is selected at 17
          // coordinates at once, so its cell is the whole set its declarations
          // reach and a filter comparing the whole cell would answer for none
          // of them. The cell is a `GROUP_CONCAT`, so this predicate can only
          // run after aggregation — which is why the page wraps the query.
          match: "set",
          vocabulary: {
            query: [
              "SELECT DISTINCT ?coordinate WHERE {",
              "  ?c a dt:Coordinate .",
              '  BIND(REPLACE(REPLACE(STR(?c), "^.*[/#]", ""), "^coordinate[.]", "") AS ?coordinate)',
              "}",
            ].join("\n"),
          },
          description: "Filter to one coordinate (e.g. criticality.success).",
        },
      ],
      search: {
        variables: ["name", "symbol"],
        description: "Search name and symbol.",
      },
      emptyRecovery: {
        message:
          "No platform variables in the store. The @canonical/token-ontology pack provides them, and a variable is only addressable once that pack publishes its name literals.",
        cli: "sources update",
      },
    },
    verbs: [
      {
        verb: "chain",
        description:
          "List the walk from a variable to every symbol it reaches, through every variable in between.",
        toolDescription:
          'List the resolution WALK: every (variable, symbol) pair a variable reaches through what its declarations reference, transitively — what a variable finally means. The closure runs over every declaration of every hop, so one variable can reach dozens of pairs. Example: variable_chain { variable: "disabled--color-text" }.',
        // ONE property path carries the whole walk, which is why this is a
        // query and not a traversal in code. `dt:references` is an rdf:List of
        // the variables a declaration's value reads, so each hop is
        // `dt:declaredAt/dt:references/rdf:rest*/rdf:first`, and the `+` makes
        // the whole thing transitive. The terminal is a variable that stands
        // for a symbol, which is what `dt:ofSymbol` reads.
        query: [
          "SELECT ?variable ?reaches ?symbol",
          "WHERE {",
          "  ?uri a dt:Variable ;",
          "       rdfs:label ?variable .",
          "  ?uri (dt:declaredAt/dt:references/rdf:rest*/rdf:first)+ ?reachedUri .",
          "  ?reachedUri dt:ofSymbol ?symbolUri ;",
          "              rdfs:label ?reaches .",
          "  ?symbolUri rdfs:label ?symbol .",
          "}",
          "ORDER BY ?variable ?reaches ?symbol",
        ].join("\n"),
        columns: [
          { field: "variable", label: "Variable" },
          { field: "reaches", label: "Reaches" },
          { field: "symbol", label: "Symbol" },
        ],
        filters: [
          {
            param: "variable",
            variable: "variable",
            // The variable roster, keyed on the same `rdfs:label` the column
            // binds and the lookup resolves by — the CSS name with its leading
            // `--` already stripped, which is the only form typable as a
            // positional. `variable.parity.test.ts` pins that the stripping is
            // injective and collides with no symbol name.
            vocabulary: {
              query: [
                "SELECT DISTINCT ?variable WHERE {",
                "  ?v a dt:Variable ;",
                "     rdfs:label ?variable .",
                "}",
              ].join("\n"),
            },
            description: "Filter to one variable.",
          },
          {
            param: "symbol",
            variable: "symbol",
            vocabulary: {
              query: [
                "SELECT DISTINCT ?symbol WHERE {",
                "  ?s a dt:TokenSymbol ;",
                "     rdfs:label ?symbol .",
                "}",
              ].join("\n"),
            },
            description: "Filter to one symbol.",
          },
        ],
        emptyRecovery: {
          message:
            "No resolution walk in the store. The @canonical/token-ontology pack provides the declarations the walk follows, and the walk is only addressable by name once that pack publishes its name literals.",
          cli: "sources update",
        },
      },
    ],
    lookup: {
      source: "sparql",
      // `rdfs:label`, matching the `name` the list publishes, and with NO
      // `nameFallback` for the same reason `token` has none: the kernel's IRI
      // derivation would publish `--color-text` with its dashes intact and its
      // dots as slashes, and a `--`-prefixed positional cannot be typed at all.
      by: "rdfs:label",
      type: "dt:Variable",
      description:
        "Look up one or more platform variables by name (without the leading dashes), IRI, or glob.",
      toolDescription:
        'Get one platform variable in full: its symbol, tier, visibility, and EVERY place it is declared — the selector and at-rule stack, the value it emits, the source location, the coordinate it also applies at, and the derivation that computed it. Address it by the CSS name WITHOUT its leading dashes (`color-text`). Two spellings of one symbol carry distinct labels, so each answers on its own. Example: variable_lookup { name: ["color-text"] }.',
      fields: [
        { name: "symbol", property: "dt:ofSymbol/rdfs:label", label: "Symbol" },
        { name: "tier", property: "dt:tier", label: "Tier" },
        { name: "visibility", property: "dt:visibility", label: "Visibility" },
      ],
      expand: [
        {
          name: "declarations",
          heading: "Declarations",
          kind: "table",
          relation: "dt:declaredAt",
          // 927 variables are declared once; the rest up to 17 times, which is
          // why this is an expand and not a set of fields.
          select: [
            { name: "under", property: "dt:under" },
            { name: "selector", property: "dt:under/dt-web:selector" },
            // The at-rule STACK, not one at-rule: `dt-web:inAtRule` is an
            // rdf:List, so the walk is `/rdf:rest*/rdf:first`. One condition of
            // the 31 nests two levels deep and so contributes two rows for one
            // declaration — that is the stack, read outermost-in, rather than a
            // duplicate.
            {
              name: "inAtRule",
              property: "dt:under/dt-web:inAtRule/rdf:rest*/rdf:first",
            },
            { name: "emits", property: "dt:emits" },
            // `dt:at` is the SOURCE LOCATION (`modifiers.theme.css:322`), not a
            // coordinate; `dt:alsoAt` is the coordinate. The two read alike and
            // mean different things, which is why both are labelled.
            { name: "at", property: "dt:at", label: "source" },
            { name: "alsoAt", property: "dt:alsoAt", label: "alsoAt" },
            { name: "derives", property: "dt:derives" },
          ],
        },
      ],
      sample: {
        fixedCount: true,
        toolDescription:
          "Return random complete platform variables — symbol, tier, visibility and every declaration — as exemplars. Use BEFORE writing queries to see real data shapes. Example: variable_sample {}.",
      },
    },
  },

  // Modifier families. `modifier list` is SPARQL (an alternation path collects
  // values asserted in either direction); `modifier lookup` is GRAPHQL, where
  // the compiled `ModifierFamily.modifiers` field is the declared-inverse union
  // and resolves both directions in ONE generated document — exactly the case
  // the GraphQL fetch path exists for.
  {
    noun: "modifier",
    description: "List all modifier families.",
    toolDescription:
      "List all modifier families with their values. Use when browsing which modifier families exist and the values each allows. Example: modifier_list {}.",
    list: {
      query: [
        "SELECT ?uri ?name",
        '       (GROUP_CONCAT(DISTINCT ?valueName; separator=", ") AS ?values)',
        "WHERE {",
        "  ?uri a ds:ModifierFamily ;",
        "       ds:name ?name .",
        "  OPTIONAL {",
        "    ?uri (ds:hasModifier|^ds:modifierFamily) ?value .",
        "    ?value ds:name ?valueName .",
        "  }",
        "}",
        "GROUP BY ?uri ?name",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "uri", label: "IRI" },
        { field: "name", label: "Name" },
        { field: "values", label: "Values" },
      ],
      emptyRecovery: {
        message:
          "No modifier families in the store. Build it from the configured design-system packs.",
        cli: "sources update",
      },
    },
    lookup: {
      source: "graphql",
      by: "ds:name",
      type: "ds:ModifierFamily",
      toolDescription:
        'Get values and usage details for one or more modifier families by name. Use when you need the allowed values of specific families. Example: modifier_lookup { name: ["importance"] }.',
      expand: [
        {
          name: "values",
          heading: "Values",
          relation: "ds:hasModifier",
          select: [{ name: "name", property: "ds:name" }],
        },
      ],
      sample: {
        fixedCount: true,
        toolDescription:
          "Return randomly selected complete modifier families (with value lists) as exemplars. Use BEFORE writing queries to see actual data shapes. Example: modifier_sample {}.",
      },
    },
  },

  // Tiers. The hierarchy is encoded in the slash-separated path string
  // (`apps/lxd`), not in graph edges, so `tier list` is a flat, name-ordered
  // list. `tier lookup` resolves a tier by its declared name and expands the
  // blocks scoped DIRECTLY to it through the inverse path `^ds:tier` — a
  // single-hop expand the generated sub-SELECT emits as `<tier> ^ds:tier ?child`
  // (property paths, inverse included, are in-contract for `PackExpand.relation`).
  // Retiring the bespoke single-`<name>` lookup for this declared variadic one
  // is an L-OPEN-9 covenant change, recorded in the covenant's $comment.
  {
    noun: "tier",
    description: "List all tiers in the design system ontology.",
    toolDescription:
      "List all tiers in the design-system ontology. Use when understanding the tier hierarchy before setting a tier filter. Example: tier_list {}.",
    list: {
      query: [
        "SELECT ?uri ?name WHERE {",
        "  ?uri a ds:Tier ;",
        "       ds:name ?name .",
        "} ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "uri", label: "IRI" },
        { field: "name", label: "Name" },
      ],
    },
    lookup: {
      source: "sparql",
      by: "ds:name",
      type: "ds:Tier",
      description: "Show tiers by name, with the blocks scoped to each.",
      toolDescription:
        'Get one or more tiers by name, with the blocks scoped directly to each. Use when you need which blocks a specific tier carries. Example: tier_lookup { name: ["apps/lxd"] }.',
      expand: [
        {
          name: "blocks",
          heading: "Blocks",
          relation: "^ds:tier",
          select: [{ name: "name", property: "ds:name" }],
        },
      ],
    },
  },
];

/**
 * The `concept` story the design-system pack also supplies: long-form
 * documentation not bound to a single UIBlock (foundations, how-to guides,
 * decision guides) — ds:Concept entries ingested from Coda. The list stays
 * terse (name/type/summary); the Markdown body is the lookup's payload,
 * served at the `standard` level with knownEdgeCases behind `detailed`.
 */
const conceptStory: PackDefinition = {
  noun: "concept",
  description: "List design-system concepts.",
  toolDescription:
    'List design-system concepts — long-form foundations, how-to guides, and decision guides not bound to a single UI block. Optionally filter by type or search. Example: concept_list { type: "Explanation" }.',
  list: {
    query: [
      "SELECT ?uri ?name ?type ?summary",
      "WHERE {",
      "  ?uri a ds:Concept ;",
      "       ds:name ?name .",
      "  OPTIONAL { ?uri ds:conceptType/ds:name ?type . }",
      "  OPTIONAL { ?uri ds:summary ?summary . }",
      "}",
      "ORDER BY ?name",
    ].join("\n"),
    columns: [
      { field: "uri", label: "IRI" },
      { field: "name", label: "Name" },
      { field: "type", label: "Type" },
      { field: "summary", label: "Summary" },
    ],
    filters: [
      {
        param: "type",
        variable: "type",
        // `ds:ConceptType` is the vocabulary; the concepts are the population.
        // The shipped graph declares six types and uses two, so validating
        // against the rows rejected "Decision guide" — a type the ontology
        // declares — as an invalid argument instead of answering with the
        // empty list it actually has.
        vocabulary: {
          query: [
            "SELECT DISTINCT ?name WHERE {",
            "  ?conceptType a ds:ConceptType ;",
            "               ds:name ?name .",
            "}",
          ].join("\n"),
          variable: "name",
        },
        description: "Filter by concept type (e.g. Explanation, How-to guide).",
      },
    ],
    search: {
      variables: ["name", "summary"],
      description: "Search in name and summary.",
    },
    emptyRecovery: {
      message:
        "No concepts in the store. The @canonical/design-system pack provides them; refresh the local store.",
      cli: "sources update",
    },
  },
  lookup: {
    source: "sparql",
    by: "ds:name",
    type: "ds:Concept",
    description:
      "Look up a concept's full documentation by name, IRI, or glob.",
    toolDescription:
      'Get a design-system concept\'s full Markdown documentation. Address concepts by the name concept_list publishes, by prefixed name (ds:concept.…), by absolute IRI, or by a glob. Example: concept_lookup { name: ["Foundations: Grid"] }.',
    fields: [
      { name: "type", property: "ds:conceptType/ds:name", label: "Type" },
      { name: "tier", property: "ds:tier", label: "Tier" },
      { name: "summary", property: "ds:summary", label: "Summary" },
    ],
    sections: [
      {
        name: "content",
        property: "ds:content",
        label: "Content",
        level: "standard",
      },
      {
        name: "knownEdgeCases",
        property: "ds:knownEdgeCases",
        label: "Known edge cases",
        level: "detailed",
      },
    ],
    disclosure: {
      levels: ["summary", "standard", "detailed"],
      default: "standard",
    },
  },
};

/**
 * The read story the implementation-graph pack supplies — which library
 * implements which block, collected from the `@implements` annotations in this
 * monorepo's source.
 *
 * The join this noun exists for crosses two packs: `ds:implementsBlock` points
 * from an implementation collected HERE at the IRI of a block declared in
 * `@canonical/design-system`. Both land in one store under the pinned `ds:`
 * namespace, so `implementation list` answers "which React components implement
 * a global-tier block" as a query rather than an afternoon of grepping — which
 * is what {@link DESIGN_SYSTEM_COLOPHON} promises.
 *
 * LIST-ONLY, deliberately. A `ds:ImplementationObject` carries no name literal
 * — it IS the edge from a library to a block, plus the two source links — so
 * there is nothing a `lookup` could disclose that the list row does not already
 * hold. The grammar admits a story with only one half; a lookup keyed on a
 * synthesised name would be a name nobody would ever type. The libraries
 * themselves ARE named, and `implementation libraries` lists them through the
 * same list machinery (as `standard categories` does).
 */
const implementationStory: PackDefinition = {
  noun: "implementation",
  description: "List which library implements which design-system block.",
  toolDescription:
    'List the implementations of design-system blocks — which library implements which block, on which platform, and the source file it lives in. Optionally filter by platform or library, or search. Example: implementation_list { platform: "react" }.',
  list: {
    // The library is the subject that carries the platform, so the row is
    // assembled from BOTH ends of `ds:hasImplementation`. `?block` prefers the
    // block's own `ds:name` and falls back to its IRI local name, so a row
    // stays readable even when the design-system pack is absent from the store
    // and only the bare `ds:implementsBlock` IRI is known.
    query: [
      "SELECT ?uri ?block ?library ?platform ?source",
      "WHERE {",
      "  ?libUri a ds:ImplementationLibrary ;",
      "          ds:libraryName ?library ;",
      "          ds:hasImplementation ?uri .",
      "  ?uri a ds:ImplementationObject ;",
      "       ds:implementsBlock ?blockUri .",
      "  OPTIONAL { ?libUri ds:platform ?platform }",
      "  OPTIONAL { ?uri ds:headLink ?source }",
      "  OPTIONAL { ?blockUri ds:name ?dsName }",
      '  BIND(COALESCE(?dsName, REPLACE(STR(?blockUri), "^.*[/#]", "")) AS ?block)',
      "}",
      "ORDER BY ?block ?library",
    ].join("\n"),
    columns: [
      { field: "block", label: "Block" },
      { field: "library", label: "Library" },
      { field: "platform", label: "Platform" },
      { field: "source", label: "Source" },
      { field: "uri", label: "IRI" },
    ],
    filters: [
      // Both vocabularies are read off `ds:ImplementationLibrary`, the subject
      // that carries them — the same terms `implementation libraries`
      // enumerates. A library that implements nothing yet still exists, and
      // asking for it is an empty answer rather than a bad argument.
      {
        param: "platform",
        variable: "platform",
        vocabulary: {
          query: [
            "SELECT DISTINCT ?platform WHERE {",
            "  ?lib a ds:ImplementationLibrary ;",
            "       ds:platform ?platform .",
            "}",
          ].join("\n"),
        },
        description: "Filter by platform (e.g. react, svelte, typescript).",
      },
      {
        param: "library",
        variable: "library",
        vocabulary: {
          query: [
            "SELECT DISTINCT ?library WHERE {",
            "  ?lib a ds:ImplementationLibrary ;",
            "       ds:libraryName ?library .",
            "}",
          ].join("\n"),
        },
        description: "Filter by implementation library name.",
      },
    ],
    search: {
      variables: ["block", "library"],
      description: "Search in block and library name.",
    },
    emptyRecovery: {
      message:
        "No implementations in the store. The @canonical/ds-implementations pack provides them; refresh the local store.",
      cli: "sources update",
    },
  },
  verbs: [
    {
      verb: "libraries",
      description: "List the implementation libraries.",
      toolDescription:
        "List the design-system implementation libraries — platform, tier, released version, and how many blocks each one implements. Example: implementation_libraries {}.",
      // `ds:implementationCount` is asserted by the aggregate index on the SAME
      // subject the per-library file describes, so the two merge in the store
      // and the count needs no aggregation here.
      query: [
        "SELECT ?uri ?name ?platform ?tier ?version ?count",
        "WHERE {",
        "  ?uri a ds:ImplementationLibrary ;",
        "       ds:libraryName ?name .",
        "  OPTIONAL { ?uri ds:platform ?platform }",
        "  OPTIONAL { ?uri ds:libraryTier ?tierUri }",
        "  OPTIONAL { ?uri ds:version ?version }",
        "  OPTIONAL { ?uri ds:implementationCount ?count }",
        '  BIND(REPLACE(STR(?tierUri), "^.*[/#]", "") AS ?tier)',
        "}",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "name", label: "Library" },
        { field: "platform", label: "Platform" },
        { field: "tier", label: "Tier" },
        { field: "version", label: "Version" },
        { field: "count", label: "Blocks" },
        { field: "uri", label: "IRI" },
      ],
      emptyRecovery: {
        message:
          "No implementation libraries in the store. The @canonical/ds-implementations pack provides them; refresh the local store.",
        cli: "sources update",
      },
    },
  ],
};

/**
 * The read story the code-standards pack supplies — `standard` as declared data.
 *
 * Normalized for the v2 grammar: the old `digest` level is the canonical
 * `standard`, so disclosure gates by the canonical index. The default is
 * `summary` (base fields by name), `--detail standard` adds the `dos` examples,
 * `--detail detailed` adds `donts`. `cs:extends` stays the raw IRI in JSON
 * (renderers compact it at display time).
 */
const codeStandardsStories: readonly PackDefinition[] = [
  {
    noun: "standard",
    description: "List all code standards.",
    toolDescription:
      'List code standards: one ROW per standard — its IRI, name, category and description — not the standards themselves. Take a row\'s `name` VERBATIM to standard_lookup for the dos and donts. Optionally filter by category slug (a parent slug answers for its whole branch; standard_categories lists them) or by search term. Example: standard_list { category: "react" }.',
    list: {
      query: [
        // `?category` is the LEAF a standard is filed under — what a row
        // displays. `?categories` is that leaf plus every ancestor, which is
        // what `--category` matches against, so asking for a parent answers for
        // the whole branch. The traversal is written ONCE, here, rather than
        // repeated by each consumer.
        "SELECT ?uri ?name ?category ?description",
        '       (GROUP_CONCAT(DISTINCT ?ancestorSlug; SEPARATOR=" ") AS ?categories)',
        "WHERE {",
        "  ?uri a cs:CodeStandard ;",
        "       cs:description ?description .",
        // `rdfs:label`, matching `lookup.by` below. Both COALESCE over the
        // SAME property with the SAME IRI fallback, and that agreement IS the
        // two-step grammar: a row's `name` goes VERBATIM to lookup. Keyed on
        // different properties they diverge for exactly the entities carrying
        // one and not the other — 16 standards in the shipped snapshot
        // published `Turtle local-name casing` from `cs:name` while lookup,
        // reading `rdfs:label`, bound the derived slug and answered
        // ENTITY_NOT_FOUND. Change one, change both.
        "  OPTIONAL { ?uri rdfs:label ?n . }",
        '  BIND(COALESCE(?n, REPLACE(STRAFTER(STR(?uri), "#"), "\\\\.", "/")) AS ?name)',
        "  OPTIONAL {",
        "    ?uri cs:hasCategory ?cat .",
        "    ?cat cs:slug ?category .",
        // `skos:broader` is deliberately NOT transitive, and this store
        // (oxigraph) has no reasoner — so `skos:broaderTransitive` returns zero
        // rows and hand-asserting it would be materialisation wearing a
        // standards badge. `broader*` is the only thing that works.
        // The `*` is REFLEXIVE and that is load-bearing: `+` would silently
        // drop every standard filed DIRECTLY on the category being asked for
        // (one of the 8 under `testing` today). Do not "correct" it.
        "    ?cat skos:broader* ?ancestor .",
        "    ?ancestor cs:slug ?ancestorSlug .",
        "  }",
        "}",
        "GROUP BY ?uri ?name ?category ?description",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "uri", label: "IRI" },
        { field: "name", label: "Name" },
        { field: "category", label: "Category" },
        { field: "description", label: "Description" },
      ],
      filters: [
        {
          param: "category",
          variable: "categories",
          match: "set",
          // The SAME terms `standard categories` enumerates (`cs:Category` /
          // `cs:slug`), so the slugs that surface hands out are exactly the
          // slugs this filter accepts. Read from the graph rather than the
          // returned ROWS: a category the graph declares with no standards
          // filed under it is reported by `standard categories` with count 0,
          // and asking for it must be the documented calm empty list, not
          // INVALID_INPUT.
          vocabulary: {
            query: [
              "SELECT DISTINCT ?slug WHERE {",
              "  ?cat a cs:Category ;",
              "       cs:slug ?slug .",
              "}",
            ].join("\n"),
            variable: "slug",
          },
          description:
            "Filter by category slug. A parent category answers for its whole branch.",
        },
      ],
      search: {
        variables: ["name", "description"],
        description: "Search in name and description.",
      },
      // Deliberately NOT `sources update`: the code standards ship in the
      // embedded snapshot and answer with no update at all, so the generic
      // build hint is actively wrong here. An empty result on this noun means
      // the filter, and the vocabulary it must be drawn from lives in the graph
      // — which is what `standard categories` reads out.
      emptyRecovery: {
        message:
          "Category slugs come from the graph, and a parent slug answers for its whole branch — read them out rather than guessing.",
        cli: "standard categories",
      },
    },
    verbs: [
      {
        verb: "categories",
        description:
          "List all standard categories with counts (a parent counts its whole branch).",
        toolDescription:
          "List all code standard categories with the number of standards each covers. Categories are a hierarchy: a parent's count includes every descendant, and `standard_list { category }` answers for the same set. Use this to pick a valid slug before filtering. Example: standard_categories {}.",
        query: [
          // The same reflexive roll-up `list` filters with — written the other
          // way round (every category whose broader-chain reaches ?cat), so the
          // count a category reports and the rows `--category` returns are the
          // same set. `COUNT(DISTINCT ?standard)`: a standard reachable by two
          // paths is still one standard.
          "SELECT ?name (COUNT(DISTINCT ?standard) AS ?count)",
          "WHERE {",
          "  ?cat a cs:Category ;",
          "       cs:slug ?name .",
          "  OPTIONAL {",
          "    ?descendant skos:broader* ?cat .",
          "    ?standard a cs:CodeStandard ;",
          "              cs:hasCategory ?descendant .",
          "  }",
          "}",
          "GROUP BY ?name",
          "ORDER BY ?name",
        ].join("\n"),
        columns: [
          { field: "name", label: "Category" },
          { field: "count", label: "Standards" },
        ],
        // Also not `sources update`. The categories ride the same embedded
        // snapshot, so zero rows means the store did not load — a health
        // question, not a staleness one.
        emptyRecovery: {
          message:
            "The code standards ship with the CLI itself, so no categories at all means the store did not load — not that it is out of date.",
          cli: "doctor",
        },
      },
    ],
    lookup: {
      source: "sparql",
      // `rdfs:label`, not `cs:name`. The pack pin above moved to v0.1.5, which
      // retired the bespoke `cs:name` for the standard property every RDF
      // consumer already reads — measured against that tag: 0 standards carry
      // `cs:name`, 148 of 148 carry exactly one `rdfs:label`. Left keyed on the
      // retired property, this story would still ANSWER — every title would
      // simply stop reaching a reader and each row would fall back to its
      // IRI-derived name, with nothing raised. That is the same silent shape as
      // reading a retired `ds:whenToUse`, one noun over.
      by: "rdfs:label",
      // The fallback stays, and is now near-inert rather than load-bearing: it
      // covered the ~87% of standards that carried no display title at all, and
      // v0.1.5 gives every one of them a curated label. It remains declared
      // because a pack is data — a future release that drops a label should
      // degrade to the IRI-derived name, not become unaddressable.
      //
      // Deliberately NOT declared on `token`/`modifier`/`tier`/`concept`:
      // each of those lists REQUIRES its `by` property, so an entity without
      // one is a row they never publish, and making it addressable (or
      // sampleable) here would be the mirror of the defect this repairs.
      //
      // `block` is NOT in that set, though an earlier version of this comment
      // claimed it was: its list COALESCEs an OPTIONAL `ds:name` with an
      // IRI-derived fallback, so a block without a `ds:name` WOULD be
      // published under a name its lookup cannot resolve. Every shipped block
      // carries `ds:name` today, so the divergence is latent — and pinned:
      // `listLookup.shipped.exec.test.ts` runs the whole corpus through both
      // halves on every test run, and goes red the moment upstream ships an
      // unnamed block. Fix it THEN, by choosing deliberately between requiring
      // the name in the list and declaring a fallback pair whose derivations
      // actually agree (the list keeps the IRI's dots; the shared
      // `nameFallback` derivation converts them to slashes — declaring the
      // fallback alone would trade one mismatch for another).
      nameFallback: "iri",
      type: "cs:CodeStandard",
      description:
        "Look up one or more standards by name, IRI, or glob. --detail standard adds the dos, --detail detailed adds the don'ts.",
      toolDescription:
        'Get one or more code standards in full, with dos and don\'ts as code examples. `detail` DEFAULTS to "summary", which returns neither: pass detail: "standard" for the dos and detail: "detailed" for dos AND don\'ts. Address a standard by the name standard_list publishes (`react/component/tsdoc`), by prefixed name (`cs:react.component.tsdoc`), by absolute IRI, or by a glob over any of those. Example: standard_lookup { name: ["react/component/tsdoc"], detail: "detailed" }.',
      fields: [
        {
          name: "category",
          property: "cs:hasCategory/cs:slug",
          label: "Category",
        },
        {
          name: "description",
          property: "cs:description",
          label: "Description",
        },
        { name: "extends", property: "cs:extends", label: "Extends" },
      ],
      expand: [
        {
          name: "dos",
          heading: "Do",
          relation: "cs:do",
          select: [
            { name: "caption", property: "cs:description" },
            { name: "language", property: "cs:language" },
            { name: "code", property: "cs:code" },
          ],
          level: "standard",
        },
        {
          name: "donts",
          heading: "Don't",
          relation: "cs:dont",
          select: [
            { name: "caption", property: "cs:description" },
            { name: "language", property: "cs:language" },
            { name: "code", property: "cs:code" },
          ],
          level: "detailed",
        },
      ],
      disclosure: {
        levels: ["summary", "standard", "detailed"],
        default: "summary",
      },
      sample: {
        description:
          "Return randomly selected complete standard instances as exemplars for shape discovery.",
        toolDescription:
          "Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances. Example: standard_sample { count: 2 }.",
      },
    },
  },
];

export default {
  name: "pragma",
  help: "Explore the design system",
  // The `--help` wordmark. Data, not code: `kernel/copy.test.ts` forbids any
  // kernel string from naming the distribution, and a wordmark spells the name.
  // Lines rather than one string — the art holds a backtick and backslashes.
  logo: [
    "              _",
    "            /' `\\",
    "          /'     )",
    "        /' (___,/'____     ____     ____     ,__________     ____",
    "      /'        )'    )--/'    )  /'    )   /'    )     )  /'    )",
    "    /'        /'       /'    /' /'    /'  /'    /'    /' /'    /'",
    "(,/'        /'        (___,/(__(___,/(__/'    /'    /(__(___,/(__",
    "                                  /'",
    "                          /     /'",
    "                         (___,/'",
  ],
  // The toolchain's own colophon — CONTENT this distribution declares, not
  // machinery: `pragma colophon` renders whatever stands here as its first
  // section, titled with the distribution's name, before any active pack's
  // domain colophon. A fork tells its own story by editing this declaration.
  // `markdown` is the full narrative; `summary` is the condensed `--format llm`
  // form. Both are BODIES with no leading H1 (the renderer supplies the
  // heading), grounded in this tree's real architecture.
  colophon: {
    // The architecture handoff is a URL, not a repo path: `docs/` is outside
    // the package's `files` allowlist and is not copied into `dist`, so an
    // installed user has no `docs/architecture.md` to open.
    markdown: `pragma is a **domain-based toolchain** — one CLI and one MCP server
projected from a single grammar. That machinery is documented at
https://github.com/canonical/pragma/blob/main/packages/cli/pragma/docs/architecture.md;
what follows is the domain it serves.

Made by the Canonical Webteam — https://canonical.com.`,
    summary: `pragma is a domain-based toolchain: one CLI + MCP server projected from a single grammar (https://github.com/canonical/pragma/blob/main/packages/cli/pragma/docs/architecture.md). The domain it serves follows.

Made by the Canonical Webteam — https://canonical.com.`,
  },
  issuesUrl: "https://github.com/canonical/pragma/issues",
  packs: [
    {
      name: "@canonical/design-system",
      source: "git+https://github.com/canonical/design-system.git#main",
      stories: [...designSystemStories, conceptStory],
    },
    {
      name: "@canonical/anatomy-dsl",
      source: "git+https://github.com/canonical/anatomy-dsl.git#main",
    },
    // The design-token semantic model: the authored `dt:` / `w3c-tokens:`
    // ontology in `definitions/` plus the generated strata in `data/`.
    //
    // The only source here carrying a SUBDIRECTORY, and it needs one: this
    // package lives inside a monorepo, at `packages/token-ontology`, while a
    // git source names a repository. `readTtlSources` scans
    // `<root>/definitions` and `<root>/data`, which the design-tokens repo
    // root does not have — so without the subdirectory this would clone
    // cleanly and contribute nothing.
    {
      name: "@canonical/token-ontology",
      source:
        "git+https://github.com/canonical/design-tokens.git#main:packages/token-ontology",
    },
    // pack an agent is most likely to quote back at a human as policy, so which
    // revision answered a query has to be recoverable — a floating ref makes
    // "the CLI told me this was the rule" unfalsifiable. The other three still
    // float: they are read for shape and identity, where the newest answer is
    // the right one.
    //
    // Bump this deliberately. `sources update` resolves the tag, so a new
    // upstream release reaches users only when this line moves — which is the
    // point, and the cost.
    {
      name: "@canonical/code-standards",
      source: "git+https://github.com/canonical/web-code-standards.git#v0.1.5",
      stories: codeStandardsStories,
    },
    // The implementation graph: ds:ImplementationLibrary / ds:ImplementationObject
    // nodes collected from `@implements` annotations across this monorepo
    // (regenerated each release into the root `data/` directory, which is what
    // a git ref scans — the npm distribution is `@canonical/ds-implementations`).
    {
      name: "@canonical/ds-implementations",
      source: "git+https://github.com/canonical/pragma.git#main",
      stories: [implementationStory],
    },
  ],
  // This distribution's domain namespaces, declared once and read twice.
  //
  // (1) They pin what `sources update` builds the store with. The design system
  // declares `ds:` twice — `…/` in `definitions/` and `…/data/` in `data/` —
  // and prefix harvesting is last-wins over a filename sort, so which one binds
  // is an accident of file naming. The config layer wins every harvest: without
  // this pin an added or renamed upstream file can silently compact every `ds:`
  // entity to the wrong prefix, and `block list` stops resolving.
  //
  // (2) They are the domain half of the kernel's `DEFAULT_PREFIX_MAP`
  // (`src/kernel/render/prefixes.ts`) — what the CLI compacts in output AND
  // what it expands a user-typed `ds:Button` / `cs:rule` through before a
  // lookup. Drop a namespace here and its lookups stop resolving; that is why
  // `cs:` is listed even though nothing rebinds it upstream.
  prefixes: {
    ds: "https://ds.canonical.com/",
    dt: "https://dt.canonical.com/",
    // Nested UNDER `dt:`, and both must be bound: `compactUri` takes the
    // longest match, so binding only the parent would render every term of
    // this vocabulary as `dt:w3c-tokens/…`.
    "w3c-tokens": "https://dt.canonical.com/w3c-tokens/",
    cs: "http://pragma.canonical.com/codestandards#",
  },
  channel: "normal",
  detail: "standard",
} satisfies RawConfig;

/**
 * The domain terms the kernel reads this distribution's graph with.
 *
 * A separate export because it is NOT a config layer field: it is compiled in
 * and read at module load by `src/kernel/vocabulary.ts`, whose readers (the
 * storeless completion fast path, the pack index builder) cannot reach a config
 * layer at all. Layering it would let a project config set it and change
 * nothing. A fork edits these values and rebuilds; `parseVocabulary` type-checks
 * the shape and rejects a term that is not a prefixed name.
 *
 * Every prefix used here must be bound in `prefixes` above. `rdfs:label` and
 * `rdfs:comment` are deliberately absent — the kernel treats standard
 * vocabulary as universal.
 *
 * The `prompt` terms are a READ CONTRACT, not a claim about instances: this
 * distribution's graph currently carries no `ds:Prompt` entities at all, so
 * `prompt list` is honestly empty. Declaring the shape anyway is what makes an
 * empty result mean "the graph has none" rather than "nothing was declared".
 */
export const vocabulary = {
  altName: "ds:name",
  prompt: {
    type: "ds:Prompt",
    body: "ds:promptBody",
    argument: "ds:promptArgument",
    argName: "ds:argName",
    argRequired: "ds:argRequired",
  },
};
