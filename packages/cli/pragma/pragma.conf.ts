/**
 * The pragma distribution config — identity, default packs, and the read
 * stories those packs supply.
 *
 * Consumed three times: statically imported by `src/kernel/config/defaults.ts`
 * as the lowest config layer (compiled into the binary — no fs), by
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

## How it fits together

- **Tiers** are a hierarchy (\`global\` > \`apps\` > \`apps/lxd\`): a lower tier
  inherits and overrides the blocks of its ancestors, so scoping a query to a
  tier walks that chain.
- **Channels** (\`normal\`, \`experimental\`, \`prerelease\`) gate visibility, so an
  in-progress block never leaks into a stable answer.

## Why RDF

One graph makes every relationship first-class and queryable: \`block lookup\`
follows edges to modifiers and subcomponents, \`graph query\` runs arbitrary
SPARQL, and \`ontology show\` reads the schema itself. The store is built once
by \`sources update\` and addressed by content hash, so the domain you query is
exactly the domain that was published.`;

/**
 * The read stories the design-system pack supplies — `block`, `token`,
 * `modifier` and `tier` as declared data rather than code.
 *
 * The association with the pack is the point: when `@canonical/design-system`
 * starts shipping its own `stories/*.json`, this block is deleted and the
 * package tier takes over with no code change here or anywhere else. The local
 * `readonly PackDefinition[]` annotation is what type-checks them —
 * `PackSource.stories` is deliberately `readonly unknown[]`, because the config
 * layer does not know the pack grammar (`parsePackDefinition` does).
 */
const designSystemStories: readonly PackDefinition[] = [
  // `block lookup` is served over the GraphQL fetch path (ONE generated document
  // over the `UIBlock` interface covering Component/Pattern/Layout/Subcomponent);
  // `block list` deliberately stays HAND-WRITTEN (tier-chain inheritance +
  // channel + `--all-tiers`), so this story ships the lookup half only. Base
  // level mirrors the old summary view (name/tier/summary); the default is
  // `detailed`, matching the old CLI which rendered anatomy and modifiers
  // without a flag. A derived name that maps onto no schema field is omitted
  // (OPTIONAL parity), so a graph lacking whenToUse/whenNotToUse degrades
  // gracefully.
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
    description: "Look up design system blocks.",
    colophon: DESIGN_SYSTEM_COLOPHON,
    lookup: {
      source: "graphql",
      toolDescription:
        'Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. Use when you need the full spec of specific blocks by name — detail: "summary" trims to the base view. Example: block_lookup { names: ["Button"] }.',
      by: "ds:name",
      types: ["ds:Component", "ds:Pattern", "ds:Layout", "ds:Subcomponent"],
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
        {
          name: "whenToUse",
          property: "ds:whenToUse",
          label: "When to use",
          level: "detailed",
        },
        {
          name: "whenNotToUse",
          property: "ds:whenNotToUse",
          label: "When not to use",
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
          "Return randomly selected complete design-system blocks as exemplars. Use BEFORE writing queries to see actual data shapes, anatomy, and property names.",
      },
    },
  },

  // Design tokens: SPARQL-sourced on both verbs. There is no `ds:Token` GraphQL
  // type to project against when the graph ships no tokens, and the lookup reads
  // a property path (`ds:tokenType/rdfs:label`) only SPARQL can express. The
  // `emptyRecovery` install hint is the story users see on an empty store;
  // `token add-config` (a mutation) stays hand-written — the pack compiler emits
  // reads only.
  {
    noun: "token",
    description: "List all design tokens.",
    toolDescription:
      "List all design tokens with their type. Use when browsing which tokens exist under the active scope. Example: token_list {}.",
    list: {
      query: [
        "SELECT ?uri ?name ?category WHERE {",
        "  ?uri a ds:Token ;",
        "       ds:tokenId ?name .",
        "  OPTIONAL {",
        "    ?uri ds:tokenType ?type .",
        "    ?type rdfs:label ?category .",
        "  }",
        "}",
        "ORDER BY ?name",
      ].join("\n"),
      columns: [
        { field: "uri", label: "IRI" },
        { field: "name", label: "Name" },
        { field: "category", label: "Type" },
      ],
      emptyRecovery: {
        message:
          "No tokens in the store. Build it from the configured design-system packs.",
        cli: "sources update",
      },
    },
    lookup: {
      source: "sparql",
      by: "ds:tokenId",
      type: "ds:Token",
      toolDescription:
        'Get type and theme values for one or more design tokens by name. Use when resolving specific tokens\' light/dark values. Example: token_lookup { names: ["color.primary"] }.',
      fields: [
        {
          name: "category",
          property: "ds:tokenType/rdfs:label",
          label: "Type",
        },
        { name: "valueLight", property: "ds:valueLight", label: "Light value" },
        { name: "valueDark", property: "ds:valueDark", label: "Dark value" },
      ],
      sample: {
        fixedCount: true,
        toolDescription:
          "Return randomly selected complete design tokens (with theme values) as exemplars. Use BEFORE writing queries to see actual data shapes.",
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
        'Get values and usage details for one or more modifier families by name. Use when you need the allowed values of specific families. Example: modifier_lookup { names: ["importance"] }.',
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
          "Return randomly selected complete modifier families (with value lists) as exemplars. Use BEFORE writing queries to see actual data shapes.",
      },
    },
  },

  // Tiers. The hierarchy is encoded in the slash-separated path string
  // (`apps/lxd`), not in graph edges, so `tier list` is a flat, name-ordered
  // list; the ordered-inheritance logic lives in the block list's tier chain.
  // `tier lookup` stays hand-written because the covenant freezes it with a
  // single `<name>` positional where a pack lookup emits a variadic `<name...>`.
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
  },
];

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
      "List code standards. Optionally filter by category or search term.",
    list: {
      query: [
        "SELECT ?uri ?name ?category ?description",
        "WHERE {",
        "  ?uri a cs:CodeStandard ;",
        "       cs:description ?description .",
        "  OPTIONAL { ?uri cs:name ?n . }",
        '  BIND(COALESCE(?n, REPLACE(STRAFTER(STR(?uri), "#"), "\\\\.", "/")) AS ?name)',
        "  OPTIONAL {",
        "    ?uri cs:hasCategory ?cat .",
        "    ?cat cs:slug ?category .",
        "  }",
        "}",
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
          variable: "category",
          description: "Filter by category name.",
        },
      ],
      search: {
        variables: ["name", "description"],
        description: "Search in name and description.",
      },
    },
    verbs: [
      {
        verb: "categories",
        description: "List all standard categories with counts.",
        toolDescription: "List all code standard categories.",
        query: [
          "SELECT ?name (COUNT(?standard) AS ?count)",
          "WHERE {",
          "  ?cat a cs:Category ;",
          "       cs:slug ?name .",
          "  OPTIONAL {",
          "    ?standard a cs:CodeStandard ;",
          "              cs:hasCategory ?cat .",
          "  }",
          "}",
          "GROUP BY ?name",
          "ORDER BY ?name",
        ].join("\n"),
        columns: [
          { field: "name", label: "Category" },
          { field: "count", label: "Standards" },
        ],
      },
    ],
    lookup: {
      source: "sparql",
      by: "cs:name",
      type: "cs:CodeStandard",
      description:
        "Look up detailed information for a standard by name, IRI, or glob.",
      toolDescription:
        "Get detailed information about one or more code standards including dos and donts with code examples. Address standards by name, prefixed name (cs:…), absolute IRI, or glob pattern (react/component/*).",
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
          "Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.",
      },
    },
  },
];

export default {
  name: "pragma",
  help: "Explore the design system",
  // The toolchain's own colophon — CONTENT this distribution declares, not
  // machinery: `pragma colophon` renders whatever stands here as its first
  // section, titled with the distribution's name, before any active pack's
  // domain colophon. A fork tells its own story by editing this declaration.
  // `markdown` is the full narrative; `summary` is the condensed `--format llm`
  // form. Both are BODIES with no leading H1 (the renderer supplies the
  // heading), grounded in this tree's real architecture.
  colophon: {
    markdown: `pragma is a **domain-based toolchain**: one CLI and one MCP server projected
from a single grammar, serving a knowledge-graph domain that reads as data.

## The effect monad

Reads are plain \`async\` functions; a mutation instead *describes* its effects
as a \`Task\` (\`@canonical/task\`) that is interpreted — under the real node
interpreter, a \`--dry-run\` planner, or an \`--undo\` reverser. Describe-then-
interpret means dry-run and undo come for free, and the dispatcher tells the two
worlds apart on one bit: \`capability.mutates\`.

## One grammar, many projections

Every capability is a \`VerbSpec\` — a noun, its params, its effect profile, its
formatters. The CLI commands, the MCP tools, shell completion, and the
surface/docs are all *projections* of that one shape, so they cannot drift. The
projected surface is frozen in a covenant (\`surface/surface.v2.json\`): a single
source of truth a test asserts the live grammar still emits, tool for tool.

## LLM-optimized output

Each verb renders three ways — \`plain\` for a terminal, \`json\` for the machine
envelope, and \`llm\` for condensed Markdown. \`--format llm\` (or a non-interactive
stdout) selects the agent form: the same data, shaped for a model to read. This
colophon is itself a showcase of that render model.

## Modular, storeless by construction

Capabilities ship as **modules** — named bundles of verbs with optional
boot / resource / prompt hooks. A verb declares whether it \`needsStore\`, and
the dispatcher boots the triple store *only* for those; a storeless verb
(\`info\`, \`config\`, \`capabilities\`, \`colophon\`) never pays for the graph.

## Scaffolding

\`pragma create\` scaffolds components, packages, and applications through the
\`@canonical/summon-*\` generators, reusing summon's rich Ink wizard when it runs
interactively.

## The domain reads as data

A domain is a **pack**: a declarative \`PackDefinition\` (its list / lookup
queries) compiled into verbs, backed by a content-addressed graphpack that
\`sources update\` builds once. Swap the pack and the same pragma serves a
different domain — including the domain colophon printed below this one.

Made by the Canonical Webteam — https://canonical.com.`,
    summary: `pragma is a domain-based toolchain: one CLI + MCP server projected from a single \`VerbSpec\` grammar.

- **Effect monad** (\`@canonical/task\`): reads are async; a mutation returns an interpreted \`Task\`, so \`--dry-run\` and \`--undo\` are free. The dispatcher branches on \`capability.mutates\`.
- **One grammar, many projections**: CLI, MCP tools, completion, and docs all project one \`VerbSpec\`; the emitted surface is frozen in a covenant so the projections never drift.
- **LLM-optimized output**: every verb renders \`plain\` / \`json\` / \`llm\`; \`--format llm\` (or a piped stdout) emits condensed Markdown for agents.
- **Modular + storeless**: capability modules; the triple store boots only for \`needsStore\` verbs.
- **Domain as data**: a pack is a declarative \`PackDefinition\` compiled to verbs over a content-addressed graph built by \`sources update\`.

Made by the Canonical Webteam — https://canonical.com.`,
  },
  issuesUrl: "https://github.com/canonical/pragma/issues",
  // The generator packages this distribution links in, and the `create` nouns
  // they expose. READ AT BUILD TIME: `scripts/build.ts` writes the literal
  // import specifiers from `name` (a `--compile` bundle carries only literal
  // specifiers — the build writes them), harvests each package's template roots,
  // and derives the whole `create` surface from `nouns`. A fork adds, swaps or
  // drops a generator package by editing this block and rebuilding; nothing in
  // `src/capabilities/create/` names a generator package at all.
  //
  // ONE PRECONDITION BEYOND THE DECLARATION, because the manifest is harvested
  // from SOURCE at build time: a declared package must be linked into this
  // package's `node_modules` and must expose its `src/**/templates` tree. A
  // registry install does not satisfy that — `@canonical/summon-component` and
  // `@canonical/summon-application` publish `files: ["dist"]`, so the two
  // packages this very block declares would fail the harvest if resolved from a
  // tarball. Vendor a generator package as a workspace sibling. The failure is
  // loud: a build-time ENOENT naming the path it looked for.
  //
  // `summary` and `examples` are CONTENT: a generator's `meta.description`
  // addresses `summon`, and its `meta.examples` are `summon …` invocations.
  // `cmd` omits the binary name — the verb builder composes it from `BIN_NAME`,
  // the same rule `emptyRecovery.cli` follows.
  generators: [
    {
      name: "@canonical/summon-component",
      nouns: {
        // A FRAMEWORK AXIS: the package's `component/react`, `component/svelte`
        // and `component/lit` generators collapse into one verb plus a
        // `--framework` enum whose values are the map keys under the prefix, in
        // map order, the first being the default. `componentPath` drops its
        // ParamSpec default so the SELECTED framework's own prompt default
        // applies — react and svelte/lit differ.
        component: {
          keyPrefix: "component",
          axis: "framework",
          summary: "Scaffold a React, Svelte, or Lit component.",
          useWhen: "Scaffolding a new component (React, Svelte, or Lit)",
          noDefault: ["componentPath"],
          // `framework` is the axis, which mirrors no prompt, so nothing
          // derives its doc — the declaration is the only place it can live.
          // `componentPath`'s question (`Component path:`) is the right thing
          // to ASK and the wrong thing to show in `--help` and an MCP arg
          // schema, where the naming rule is what a reader needs.
          docs: {
            framework: "Component framework.",
            componentPath:
              "Component path (its final segment is the PascalCase component name).",
          },
          examples: [
            {
              cmd: "create component src/components/Button --framework react",
              note: "React component with tests, stories, and styles",
            },
            {
              cmd: "create component src/lib/Card --framework svelte --dry-run",
              note: "preview the files without writing",
            },
          ],
        },
      },
    },
    {
      name: "@canonical/summon-package",
      nouns: {
        package: {
          key: "package",
          summary: "Scaffold a new npm package for the monorepo.",
          useWhen:
            "Scaffolding a new npm package with proper monorepo configuration",
          optIn: ["runInstall"],
          examples: [
            { cmd: "create package --name @canonical/my-lib --type library" },
            { cmd: "create package --name @canonical/my-tool --run-install" },
          ],
        },
      },
    },
    {
      name: "@canonical/summon-application",
      nouns: {
        // The package also ships `domain`, `route` and `wrapper`; `create`
        // exposes one of its four generators. Surfacing a noun is a
        // declaration, so widening the surface is an edit here and nowhere else.
        application: {
          key: "application/react",
          summary: "Scaffold a full React application with SSR and routing.",
          useWhen:
            "Scaffolding a new React application with SSR, routing, and optional Relay",
          optIn: ["runInstall"],
          withPrefixed: ["ssr", "router", "forms", "relay"],
          examples: [
            { cmd: "create application my-app" },
            { cmd: "create application my-app --with-relay" },
          ],
        },
      },
    },
  ],
  packs: [
    {
      name: "@canonical/design-system",
      source: "git+https://github.com/canonical/design-system.git#main",
      stories: designSystemStories,
    },
    {
      name: "@canonical/anatomy-dsl",
      source: "git+https://github.com/canonical/anatomy-dsl.git#main",
    },
    {
      name: "@canonical/code-standards",
      source: "git+https://github.com/canonical/web-code-standards.git#main",
      stories: codeStandardsStories,
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
