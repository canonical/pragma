# MCP tool reference

Every tool the pragma MCP server exposes, plus its non-tool surface. Generated from the live capability grammar — do not edit by hand. The server's `serverInfo` is a projection, not a constant: it introduces itself on the wire under the distribution's declared name at the package version, so a client should read `serverInfo` rather than assume a name.

Mutating tools are plan-first: called without `confirm: true` they return the plan they WOULD apply; called with `confirm: true` they execute. A mutating tool also accepts an optional absolute `cwd`.

### block_list

List all design system blocks with their type, tier, and modifier families. Use when browsing which blocks exist. Example: block_list {}.

Read-only.

**Input**

_No input parameters._

### block_lookup

Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. Use when you need the full spec of specific blocks by name — detail: "summary" trims to the base view. Example: block_lookup { names: ["Button"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Block names, prefixed names/IRIs, or glob patterns. |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default detailed). |

### block_sample

Return randomly selected complete design-system blocks as exemplars. Use BEFORE writing queries to see actual data shapes, anatomy, and property names.

Read-only.

**Input**

_No input parameters._

### capabilities

Storeless orientation for agents. Returns the conventions (KG / tier-channel / SPARQL model), a four-stage discovery sequence, and every live tool with a behavioural use_when hint and category — all derived from the live grammar, so it never drifts. Call it first at session start.

Read-only.

**Input**

_No input parameters._

### colophon

Storeless — the colophon each active pack declares for its domain. With no pack telling a story, it prints the one pragma declares for itself instead; with neither, it says so. Also available as a condensed Markdown narration for agents, or as a structured JSON projection of the sections.

Read-only.

**Input**

_No input parameters._

### config_get

Reads the effective value of a single field after layering — built-in defaults, the global config, and the nearest project config. Prints the bare value (nothing when the field is unset), so the output substitutes directly into a shell.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | enum(tier, channel, detail) | yes | The config field to read. (one of: tier, channel, detail) |

### config_set

Write a global config field by name. `key` is one of `tier`, `channel`, or `detail`; clearing a field is `config unset <key>`'s job, and the values that used to double as clear-markers are refused. Written to the global layer only — project configs are authored by hand.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | enum(tier, channel, detail) | yes | The config field to write. (one of: tier, channel, detail) |
| `value` | string | yes | The value to write. |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### config_show

Merges built-in defaults, the global XDG config, and the nearest pragma.config.ts, marking which layer supplied each value.

Read-only.

**Input**

_No input parameters._

### config_unset

Removes a field from the global config so the built-in default (or a project config) applies again. The counterpart of `config set` — setting writes a value, unsetting removes one; no value doubles as a remove-marker.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | enum(tier, channel, detail) | yes | The config field to clear. (one of: tier, channel, detail) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### create_application

Scaffold a full React application with SSR and routing.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `appPath` | string | no | Application directory name. (default: my-app) |
| `forms` | boolean | no | Include form components. (default: true) |
| `intl` | boolean | no | Include internationalisation (locale negotiation, translated UI, locale switcher). (default: false) |
| `relay` | boolean | no | Include a Relay (GraphQL) data layer with a local mock schema. (default: false) |
| `runInstall` | boolean | no | Install dependencies now. (default: true) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### create_component

Scaffold a React, Svelte, or Lit component.

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

Scaffold a new npm package for the monorepo.

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

Reports the environment checks and then one row per setup target in each band, as pass, fail, available (an opt-in integration not yet set up), or skip, with inline remedies. Every banded row is named after the setup target that repairs it. Storeless by default; the store check boots lazily and never fails the run.

Read-only.

**Input**

_No input parameters._

### graph_inspect

Inspect one entity: all predicate/object pairs asserted on the subject. Address it by prefixed name (ds:button) or absolute IRI.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `uri` | string | yes | The subject URI — a prefixed name or absolute IRI. |

### graph_query

Executes an arbitrary SPARQL query (SELECT / ASK / CONSTRUCT) against the store. Prefixes are applied automatically from the pack's namespace map; list the ontology namespaces to discover the available prefixes.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `sparql` | string | yes | The SPARQL query text (SELECT, ASK, or CONSTRUCT). |

### info

Storeless — reports the CLI version, how it was installed, the layered config with per-field origins, an entity total from the pack index, and (network, silent-fail) whether a newer release is available.

Read-only.

**Input**

_No input parameters._

### modifier_list

List all modifier families with their values. Use when browsing which modifier families exist and the values each allows. Example: modifier_list {}.

Read-only.

**Input**

_No input parameters._

### modifier_lookup

Get values and usage details for one or more modifier families by name. Use when you need the allowed values of specific families. Example: modifier_lookup { names: ["importance"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Modifier names, prefixed names/IRIs, or glob patterns. |

### modifier_sample

Return randomly selected complete modifier families (with value lists) as exemplars. Use BEFORE writing queries to see actual data shapes.

Read-only.

**Input**

_No input parameters._

### ontology_list

List loaded ontology namespaces with class and property counts.

Read-only.

**Input**

_No input parameters._

### ontology_lookup

Look up a namespace's classes (hierarchy + counts) and properties.

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

Browse the prompt entities the active graph declares (ds:Prompt in this distribution) — name, description, and argument names. This distribution's graph carries none today. The same prompts are offered natively over MCP prompts/list; use prompt_lookup for the full template body.

Read-only.

**Input**

_No input parameters._

### prompt_lookup

Fetch a single prompt entity's full template body (with {{arg}} placeholders) and its declared arguments. A prompt is addressed by its label; prompt_list names the ones the active graph carries.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | The prompt name, as `prompt list` reports it. |

### setup

Plans every target in the selected band, then applies the ones you keep. The user/home band is the default; --local targets the project band, and --both runs each. A run with no terminal prints the plan and applies nothing unless --yes is given.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `scope` | enum(project, global, both) | no | Which config band(s) to configure: global (the default), project, or both. (one of: project, global, both) (default: global) |
| `global` | boolean | no | Shorthand for --scope global (configure the user/home band). |
| `local` | boolean | no | Shorthand for --scope project (configure the per-project band). |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### skill_list

List discovered skills (SKILL.md files under the skill roots).

Read-only.

**Input**

_No input parameters._

### skill_lookup

Show a skill's metadata and instructions by name.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | The skill name. |

### sources_status

Storeless — reads config and the pack cache without booting the store, so it works even when the store is cold. Reports whether reads are answered by a locally built pack, by the embedded snapshot, or not at all.

Read-only.

**Input**

_No input parameters._

### sources_update

Resolves each configured pack (git/file/npm) and builds one content-addressed pack, which every later boot reads with no network access. Pin a revision by putting a commit SHA in the pack's source ref.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `skipInvalid` | boolean | no | Skip sources that fail to parse (warning about each) and build from the rest, instead of failing the whole update. |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### standard_categories

List all code standard categories.

Read-only.

**Input**

_No input parameters._

### standard_list

List code standards. Optionally filter by category or search term.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `category` | string | no | Filter by category name. |
| `search` | string | no | Search in name and description. |

### standard_lookup

Get detailed information about one or more code standards including dos and donts with code examples. Address standards by name, prefixed name (cs:…), absolute IRI, or glob pattern (react/component/*).

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Standard names, prefixed names/IRIs, or glob patterns. |
| `detail` | enum(summary, standard, detailed) | no | Progressive-disclosure level (default summary). |

### standard_sample

Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | string | no | Number of samples (1–5, default 2). |

### tier_list

List all tiers in the design-system ontology. Use when understanding the tier hierarchy before setting a tier filter. Example: tier_list {}.

Read-only.

**Input**

_No input parameters._

### tier_lookup

Get one or more tiers by name, with the blocks scoped directly to each. Use when you need which blocks a specific tier carries. Example: tier_lookup { names: ["apps/lxd"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Tier names, prefixed names/IRIs, or glob patterns. |

### token_list

List all design tokens with their type. Use when browsing which tokens exist under the active scope. Example: token_list {}.

Read-only.

**Input**

_No input parameters._

### token_lookup

Get type and theme values for one or more design tokens by name. Use when resolving specific tokens' light/dark values. Example: token_lookup { names: ["color.primary"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Token names, prefixed names/IRIs, or glob patterns. |

### token_sample

Return randomly selected complete design tokens (with theme values) as exemplars. Use BEFORE writing queries to see actual data shapes.

Read-only.

**Input**

_No input parameters._

### upgrade

Checks the registry for the active channel's latest release and runs your package manager's global-update command. Preview the update before applying it.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

## Non-tool surface

- **Resources**: `pragma:{+uri}` — entity reads addressed by URI (listing and autocomplete are storeless over the pack index). The template — its scheme and the `_meta` taxonomy keys its entries carry — is frozen protocol identity, served unchanged by every distribution: clients persist resource URIs, so the scheme never follows a fork's name.
- **Prompts**: the workflow prompt templates the active graph declares are offered natively over `prompts/list` and `prompts/get`, and as the `prompt_list` / `prompt_lookup` content tools. A graph declaring none leaves both views empty.
- **Instructions**: the server always sends handshake instructions describing the conventions and the discovery sequence.
