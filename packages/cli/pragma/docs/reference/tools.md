# MCP tool reference

Every tool the pragma MCP server exposes, plus its non-tool surface. Generated from the live capability grammar — do not edit by hand. The server's `serverInfo` is a projection, not a constant: it introduces itself on the wire under the distribution's declared name at the package version, so a client should read `serverInfo` rather than assume a name.

Mutating tools are plan-first: called without `confirm: true` they return the plan they WOULD apply; called with `confirm: true` they execute. A mutating tool also accepts an optional absolute `cwd`.

### block_list

Use when asked which components, patterns, layouts or subcomponents exist — all four are blocks, and every one of them is read through the block tools. List all design system blocks with their type, tier, and modifier families. Example: block_list { tier: "all" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tier` | string | no | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### block_lookup

Use when asked about one component, pattern or layout by name — its anatomy, properties, variants, or when to use it. Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. `detail: "summary"` trims to the base view. Example: block_lookup { name: ["Button"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Block names, prefixed names/IRIs, or glob patterns. |
| `tier` | string | no | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default detailed). |

### block_sample

Use before your first block query, to see what a real block record looks like instead of guessing field names. Return randomly selected complete design-system blocks as exemplars.

Read-only.

**Input**

_No input parameters._

### capabilities

Use when unsure which tool answers a question. Storeless orientation for agents. Returns the conventions (KG / tier-channel / SPARQL model), a four-stage discovery sequence, and every live tool with a behavioural use_when hint and category — all derived from the live grammar, so it never drifts. Call it first at session start.

Read-only.

**Input**

_No input parameters._

### colophon

Use when asked which packs the data comes from. Storeless — the colophon each active pack declares for its domain. With no pack telling a story, it prints the one pragma declares for itself instead; with neither, it says so. Also available as a condensed Markdown narration for agents, or as a structured JSON projection of the sections.

Read-only.

**Input**

_No input parameters._

### concept_list

Use when asked for design guidance that is not about one component — foundations, how-to guides, decision guides. List design-system concepts — long-form foundations, how-to guides, and decision guides not bound to a single UI block. Optionally filter by type or search. Example: concept_list { type: "Explanation" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string[] | no | Filter by concept type (e.g. Explanation, How-to guide). |
| `search` | string | no | Search in name and summary. |
| `tier` | string | no | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### concept_lookup

Use when asked to read one guide or foundation in full. Get a design-system concept's full Markdown documentation. Address concepts by the name concept_list publishes, by prefixed name (ds:concept.…), by absolute IRI, or by a glob. Example: concept_lookup { name: ["Foundations: Grid"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Concept names, prefixed names/IRIs, or glob patterns. |
| `tier` | string | no | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default standard). |

### config_get

Use when asked for the value of one setting. Reads the effective value of a single field after layering — built-in defaults, the global config, and the nearest project config. Prints the bare value (nothing when the field is unset), so the output substitutes directly into a shell. Example: config_get { key: "tier" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | enum(tier, channel, detail) | yes | The config field to read. (one of: tier, channel, detail) |

### config_set

Use when asked to change a setting, such as making one product's tier the default for every read. Write a global config field by name. `key` is one of `tier`, `channel`, or `detail`; clearing a field is `config unset <key>`'s job, and the values that used to double as clear-markers are refused. Written to the global layer only — project configs are authored by hand. Example: config_set { key: "tier", value: "apps/lxd" }.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | enum(tier, channel, detail) | yes | The config field to write. (one of: tier, channel, detail) |
| `value` | string | yes | The value to write. |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### config_show

Use when asked how the tool is configured and which file set each value. Merges built-in defaults, the global XDG config, and the nearest pragma.config.ts, marking which layer supplied each value.

Read-only.

**Input**

_No input parameters._

### config_unset

Use when asked to put a setting back to its built-in default. Removes a field from the global config so the built-in default (or a project config) applies again. The counterpart of `config set` — setting writes a value, unsetting removes one; no value doubles as a remove-marker. Example: config_unset { key: "tier" }.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | enum(tier, channel, detail) | yes | The config field to clear. (one of: tier, channel, detail) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### create_application

Use when asked to start a new React application, server-rendered or client-only. Example: create_application { appPath: "my-app" }.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `appPath` | string | no | Application directory name. (default: my-app) |
| `forms` | boolean | no | Include form components. (default: true) |
| `intl` | boolean | no | Include internationalisation (locale negotiation, translated UI, locale switcher). (default: false) |
| `rendering` | enum(ssr, spa) | no | Rendering — ssr keeps the server layer (SSR servers and sitemap), spa is client-only. (one of: ssr, spa) (default: ssr) |
| `relay` | boolean | no | Include a Relay (GraphQL) data layer with a local mock schema. (default: false) |
| `runInstall` | boolean | no | Install dependencies now. (default: true) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### create_component

Use when asked to start a new React, Svelte or Lit component with its tests, stories and styles. Example: create_component { framework: "react", componentPath: "src/components/Button" }.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `framework` | enum(react, svelte, lit) | yes | Component framework — the tree segment (`create component <framework>`). (one of: react, svelte, lit) |
| `componentPath` | string | no | Component path. |
| `withStyles` | boolean | no | Include styles. (default: true) |
| `withStories` | boolean | no | Include Storybook stories. (default: true) |
| `withSsrTests` | boolean | no | Include SSR tests. (frameworks: react, svelte) (default: true) |
| `useTsStories` | boolean | no | Use TypeScript stories format? (otherwise Svelte CSF). (frameworks: svelte) (default: false) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### create_package

Use when asked to start a new npm package inside the monorepo. Example: create_package { name: "@canonical/my-lib", type: "library" }.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | no | Package name. (default: @canonical/my-package) |
| `type` | enum(tool-ts, library, css) | no | Package type. (one of: tool-ts, library, css) (default: tool-ts) |
| `description` | string | no | Package description. (default: ) |
| `withReact` | boolean | no | Include React dependencies. (default: false) |
| `withStorybook` | boolean | no | Include Storybook setup. (default: false) |
| `withCli` | boolean | no | Include CLI binary entry point. (default: false) |
| `withPrTemplate` | boolean | no | Include a .github/PULL_REQUEST_TEMPLATE.md. (default: false) |
| `runInstall` | boolean | no | Run package manager install after creation. (default: true) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### doctor

Use when something is not working, to find out what. Reports the environment checks first, then one row per setup target — once for your home directory, once for this project. Each row is pass, fail, available (an optional integration you have not set up yet), or skip (nothing to do here, and the row says why), with the next step printed inline. Every row is named after the setup target that repairs it, except `harnesses`: a listing, per scope, of the AI harnesses found on this machine and whether this CLI's MCP server is registered in each — the ones actually found, or every harness it knows about under the verbose global flag. Needs no store; the store check boots lazily and never fails the run.

Read-only.

**Input**

_No input parameters._

### graph_connect

Use when asked whether and how two things are related. Finds every shortest path of RELATION edges between two entities, and says which kind of nothing it found when there is no path. An edge counts as a relation only where it does not fan out into a roster — membership of a class, a tier or a family is answered by that noun's list verb, not by a path — so most pairs are correctly reported as unconnected. Address each endpoint by prefixed name (ds:global.component.button) or absolute IRI. Every answer states the hop limit, the fan-in threshold, and the packs searched. Example: graph_connect { a: "ds:global.component.button", b: "dt:color.text" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | string | yes | The first endpoint — a prefixed name or absolute IRI. |
| `b` | string | yes | The second endpoint — a prefixed name or absolute IRI. |
| `hops` | number | no | Largest path length to return (default 4, ceiling 6). (default: 4) |
| `paths` | number | no | Most shortest paths to show (default 10); the answer always reports the true total. (default: 10) |

### graph_inspect

Use when asked for everything recorded about one identifier. Inspect one entity: all predicate/object pairs asserted on the subject. Address it by prefixed name (ds:global.component.button) or absolute IRI. Example: graph_inspect { uri: "ds:global.component.button" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `uri` | string | yes | The subject URI — a prefixed name or absolute IRI. |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default standard). |

### graph_query

Use only when no other tool answers: SPARQL joins or counts. Executes an arbitrary SPARQL query (SELECT / ASK / CONSTRUCT) against the store. Prefixes are applied automatically from the pack's namespace map; list the ontology namespaces to discover the available prefixes. Example: graph_query { sparql: "SELECT ?s WHERE { ?s a ds:Component } LIMIT 5" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `sparql` | string | yes | The SPARQL query text (SELECT, ASK, or CONSTRUCT). |

### implementation_libraries

Use when asked which component libraries exist and what each covers. List the design-system implementation libraries — platform, tier, released version, and how many blocks each one implements.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### implementation_list

Use when asked whether a component is implemented in React, Svelte or another library, or where its source code lives. List the implementations of design-system blocks — which library implements which block, on which platform, and the source file it lives in. Optionally filter by platform or library, or search. Example: implementation_list { platform: "react" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `platform` | string[] | no | Filter by platform (e.g. react, svelte, typescript). |
| `library` | string[] | no | Filter by implementation library name. |
| `search` | string | no | Search in block and library name. |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### info

Use when asked which version is installed or whether an update exists. Storeless — reports the CLI version, how it was installed, the layered config with per-field origins, an entity total from the pack index, and (network, silent-fail) whether a newer release is available.

Read-only.

**Input**

_No input parameters._

### modifier_list

Use when asked which variants or options components can take — importance, size, density and the like — and the values each allows. List all modifier families with their values. Example: modifier_list { tier: "all" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `tier` | string | no | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### modifier_lookup

Use when asked which values one option allows, such as the levels of importance. Get values and usage details for one or more modifier families by name. Example: modifier_lookup { name: ["importance"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Modifier names, prefixed names/IRIs, or glob patterns. |
| `tier` | string | no | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default detailed). |

### modifier_sample

Use before your first modifier query, to see what a real modifier family record looks like. Return randomly selected complete modifier families (with value lists) as exemplars.

Read-only.

**Input**

_No input parameters._

### ontology_list

Use when asked which vocabularies (namespaces and their prefixes) the data uses — the first step before writing a raw query.

Read-only.

**Input**

_No input parameters._

### ontology_lookup

Use before writing a raw query, to find the real class and property names under one prefix. Example: ontology_lookup { prefix: "ds" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `prefix` | string | yes | The namespace prefix (ds) or full URI. |
| `properties` | boolean | no | Include the properties section (also implied by --detail standard or higher). |
| `fullUris` | boolean | no | Show full IRIs instead of prefixed. |
| `class` | string | no | Focus on one class and its properties. |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default summary). |

### prompt_list

Use when asked which ready-made workflow prompts the design system offers. Browse the prompt entities the active graph declares (ds:Prompt in this distribution) — name, description, and argument names. This distribution's graph carries none today. The same prompts are offered natively over MCP prompts/list; use prompt_lookup for the full template body.

Read-only.

**Input**

_No input parameters._

### prompt_lookup

Use when asked to read or run one workflow prompt by the name prompt_list gave. Fetch a single prompt entity's full template body (with {{arg}} placeholders) and its declared arguments. A prompt is addressed by its label; prompt_list names the ones the active graph carries. Example: prompt_lookup { name: "build-a-block" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | The prompt name, as `prompt list` reports it. |

### setup

Use when asked to install or repair the tool's integration: the config file, shell completions, MCP registration, skills and the editor extension. Shows what each target needs, then applies the ones you keep. Everything is configured in your home directory by default; the scope option moves the run to this project alone, or covers both. Without an attended terminal the plan is printed and nothing is written unless the run is explicitly confirmed. Example: setup { scope: "project" }.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `scope` | enum(project, global, both) | no | Where to configure: global (your home directory, the default), project (this repository), or both. (one of: project, global, both) (default: global) |
| `global` | boolean | no | Shorthand for --scope global — configure your home directory. |
| `local` | boolean | no | Shorthand for --scope project — configure this project only. |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### skill_list

Use when asked which agent skills (guided workflows) are available.

Read-only.

**Input**

_No input parameters._

### skill_lookup

Use when asked to follow one skill. Example: skill_lookup { name: "specify-component" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | The skill name. |

### sources_reset

Use to discard locally built data and return to the data shipped with the tool. Deletes the pointer that names the pack this project reads, so reads answer from the snapshot shipped with the CLI again; a project that declares its own packs cannot answer reads until the next `sources update`. The cached pack files are left alone — they are shared with any other project built from the same sources, and a later update reuses them. Reports calmly when nothing is built.

Mutation — plan-first (set `confirm: true` to apply). Marked destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### sources_status

Use when results look empty or stale, to see which data pack is answering. Storeless — reads config and the pack cache without booting the store, so it works even when the store is cold. Reports whether reads are answered by a locally built pack, by the embedded snapshot, or not at all.

Read-only.

**Input**

_No input parameters._

### sources_update

Use when asked to fetch or rebuild the design-system data, or when a read reports that the store is unavailable. Resolves each configured pack (git, file, or npm) and builds one local pack from them, which every later run reads without touching the network. Put a commit SHA in a pack source ref to pin it to that revision. Example: sources_update { skipInvalid: true }.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `skipInvalid` | boolean | no | Build from the sources that parse, warning about each one that does not, instead of failing the whole update. |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### standard_categories

Use when asked which areas the code standards cover. List all code standard categories with the number of standards each covers. Categories are a hierarchy: a parent's count includes every descendant, and `standard_list { category }` answers for the same set. Use this to pick a valid slug before filtering.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### standard_list

Use when asked which coding rules or conventions apply — for React, CSS, testing, documentation and so on. List code standards: one ROW per standard — its IRI, name, category and description — not the standards themselves. Take a row's `name` VERBATIM to standard_lookup for the dos and donts. Optionally filter by category slug (a parent slug answers for its whole branch; standard_categories lists them) or by search term. Example: standard_list { category: "react" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `category` | string[] | no | Filter by category slug. A parent category answers for its whole branch. |
| `search` | string | no | Search in name and description. |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### standard_lookup

Use when asked how code should be written under one rule. Get one or more code standards in full, with dos and don'ts as code examples. `detail` DEFAULTS to "summary", which returns neither: pass detail: "standard" for the dos and detail: "detailed" for dos AND don'ts. Address a standard by the name standard_list publishes (`react/component/tsdoc`), by prefixed name (`cs:react.component.tsdoc`), by absolute IRI, or by a glob over any of those. Example: standard_lookup { name: ["react/component/tsdoc"], detail: "detailed" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Standard names, prefixed names/IRIs, or glob patterns. |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default summary). |

### standard_sample

Use before your first standards query, to see what a real code standard record looks like. Return 1–5 randomly selected complete code standard instances as exemplars. Each call returns different instances. Example: standard_sample { count: "2" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | string | no | Number of samples (1–5, default 2). |

### tier_list

Use when asked which tiers the design system has — global, apps, a single product — or before passing `tier` to another tool. List all tiers in the design-system ontology. The `tier` parameter scopes a read to one tier plus its ancestors, and this list is never scoped itself.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### tier_lookup

Use when asked which components belong to one tier or product. Get one or more tiers by name, with the blocks scoped directly to each. Example: tier_lookup { name: ["apps/lxd"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Tier names, prefixed names/IRIs, or glob patterns. |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default detailed). |

### token_consumers

Use when asked which components use a token, or what changing one affects. List the token BINDINGS the design system records — which block consumes which symbol, at which style key, state, rank and node. Every column is identity: two bindings differing only in state are different facts. The block is the CONSUMING block; via names the block whose anatomy the binding was authored in, and is blank when that is the consuming block itself. Name the symbol by its dotted name (symbol) or by a CSS variable standing for it (variable). Answers empty until the packs record bindings. Example: token_consumers { symbol: "color.text" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `symbol` | string[] | no | Filter to one symbol. |
| `variable` | string[] | no | A CSS variable name for the consumed symbol — the other spelling of the symbol parameter. A channel variable and its semantic sibling differ. |
| `key` | string[] | no | Filter to one style key. |
| `state` | string[] | no | Filter to one interaction state. |
| `search` | string | no | Search block, via, symbol, key, state and node. |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### token_list

Use when asked which design tokens exist — colours, spacing, typography — or to find a token's exact name. List the design-token SYMBOLS — logical dotted names (`color.text`), with the type and description from the symbol's OWN definition, and the symbol a channel provisions. The CSS custom-property names a stylesheet declares are variable_list. Example: token_list { type: "color" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string[] | no | Filter by type. |
| `channelOf` | string[] | no | Filter to one symbol's channels. |
| `search` | string | no | Search name and description. |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### token_lookup

Use when asked everything about one token by name: where it is defined, what can change it, and its values. Get one design-token symbol in full: its own type and description, every definition behind it with that definition's own type and description, the modifier families that may rebind it, and the value it resolves to at each position. Address it by the dotted name token_list publishes (`color.text`), by prefixed name, by IRI, or by a glob. Example: token_lookup { name: ["color.text"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Token names, prefixed names/IRIs, or glob patterns. |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default detailed). |

### token_sample

Use before your first token query, to see what a real token record looks like. Return random complete design-token symbols — definitions, coverage and resolved values — as exemplars.

Read-only.

**Input**

_No input parameters._

### token_values

Use when asked what value a token has, in light, dark or any other mode. List the resolved token VALUES — one row per (symbol, position) the graph materialises, with the value and either its resolution chain or the symbol it derives from. Only MATERIALISED positions appear, not the permutation space: a position with no row falls through to the base symbol. A derived row carries a derivation and no value cell. Example: token_values { symbol: "color.text" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `symbol` | string[] | no | Filter to one symbol. |
| `position` | string[] | no | Filter to one position. |
| `search` | string | no | Search symbol, value, derivation. |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### upgrade

Use when asked to update the CLI itself to the latest release. Checks the registry for the active channel's latest release and runs your package manager's global-update command. Preview the update before applying it.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### variable_chain

Use when asked which tokens a CSS variable ends up referring to. List the resolution WALK: every (variable, symbol) pair a variable reaches through what its declarations reference, transitively — what a variable finally means. The closure runs over every declaration of every hop, so one variable can reach dozens of pairs. Example: variable_chain { variable: "modifier-color-text" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `variable` | string[] | no | Filter to one variable. |
| `symbol` | string[] | no | Filter to one symbol. |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### variable_list

Use when asked which CSS custom properties (variables) exist, or which CSS variable stands for a token. List the platform VARIABLES a stylesheet declares as CSS custom properties, with the symbol each stands for, its tier, visibility and the coordinates it is selected at. 236 stand for no symbol, so token_list cannot reach them. Address one WITHOUT its leading dashes (`color-text`). Example: variable_list { symbol: "color.text" }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `platform` | string[] | no | Filter by platform. |
| `symbol` | string[] | no | Filter to one symbol. |
| `tier` | string[] | no | Filter by tier. |
| `visibility` | string[] | no | Filter by visibility. |
| `coordinate` | string[] | no | Filter to one coordinate. |
| `search` | string | no | Search name and symbol. |
| `limit` | number | no | Maximum rows to return, 1 to 40000 (default 300). |
| `after` | string | no | Continue from a previous page: the cursor that page reported. |

### variable_lookup

Use when asked about one CSS variable by name: what it stands for and everywhere it is declared. Get one platform variable in full: its symbol, tier, visibility, and EVERY place it is declared — the selector and at-rule stack, the emitted value, the source location, the coordinate it also applies at, and the derivation. Address it by the CSS name WITHOUT its leading dashes (`color-text`). Example: variable_lookup { name: ["color-text"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Variable names, prefixed names/IRIs, or glob patterns. |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default detailed). |

### variable_sample

Use before your first variable query, to see what a real CSS variable record looks like. Return random complete platform variables — symbol, tier, visibility and every declaration — as exemplars.

Read-only.

**Input**

_No input parameters._

## Non-tool surface

- **Resources**: `pragma:{+uri}` — entity reads addressed by URI (listing and autocomplete are storeless over the pack index). The template — its scheme and the `_meta` taxonomy keys its entries carry — is frozen protocol identity, served unchanged by every distribution: clients persist resource URIs, so the scheme never follows a fork's name.
- **Prompts**: the workflow prompt templates the active graph declares are offered natively over `prompts/list` and `prompts/get`, and as the `prompt_list` / `prompt_lookup` content tools. A graph declaring none leaves both views empty.
- **Instructions**: the server always sends handshake instructions: the conventions, and a generated index of tools by the question each answers, fitted to 2,000 characters.
