# MCP tool reference

Every tool the pragma MCP server exposes, plus its non-tool surface. Generated from the live capability grammar — do not edit by hand.

Mutating tools are plan-first: called without `confirm: true` they return the plan they WOULD apply; called with `confirm: true` they execute. A mutating tool also accepts an optional absolute `cwd`.

### block_list

List design system blocks visible under the active tier chain and channel. Optionally list across every tier, ignoring the tier filter.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `allTiers` | boolean | no | Show blocks from all tiers, ignoring the tier filter. |

### block_lookup

Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. Use when you need the full spec of specific blocks by name — detail: "summary" trims to the base view. Example: block_lookup { names: ["Button"] }.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string[] | yes | Block names, prefixed names/IRIs, or glob patterns. |
| `detail` | enum(summary, detailed) | no | Progressive-disclosure level (default detailed). |

### block_sample

Return randomly selected complete design-system blocks as exemplars. Use BEFORE writing queries to see actual data shapes, anatomy, and property names.

Read-only.

**Input**

_No input parameters._

### capabilities

Storeless orientation for agents. Returns the conventions (KG / tier-channel / SPARQL model), a 3-stage discovery sequence, and every live tool with a behavioural use_when hint and category — all derived from the live grammar, so it never drifts. Call it first at session start.

Read-only.

**Input**

_No input parameters._

### colophon

Storeless — a colophon for the toolchain. Prints pragma's own story (the effect monad, one-grammar-many-projections, the render/LLM-output model, storeless modularity, and the domain-as-data pack model) followed by the active pack's domain colophon. Also available as a condensed Markdown narration for agents, or as a structured JSON projection of the sections.

Read-only.

**Input**

_No input parameters._

### config_channel

Writes the `channel` field to the global config. Reset by setting the default, `normal`.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | enum(normal, experimental, prerelease) | yes | The channel name to write. (one of: normal, experimental, prerelease) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### config_detail

Writes the `detail` field to the global config. Reset by setting the default, `standard`.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `level` | enum(summary, standard, detailed) | yes | The detail level to write. (one of: summary, standard, detailed) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### config_set

Write a global config field by name — the one-command form of the per-field setters. `key` is one of `tier`, `channel`, or `detail`; the field's own reset rules apply (e.g. `set tier none` clears it). Written to the global layer only — project configs are authored by hand.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `key` | enum(tier, channel, detail) | yes | The config field to write. (one of: tier, channel, detail) |
| `value` | string | yes | The value to write (or a field's reset sentinel, e.g. `none`). |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### config_show

Merges built-in defaults, the global XDG config, and the nearest pragma.config.ts, marking which layer supplied each value.

Read-only.

**Input**

_No input parameters._

### config_tier

Writes the `tier` field to the global config. Pass `none`, `default`, or `-` to clear it. Written to the global layer only — project configs are authored by hand.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `path` | string | yes | The tier path to write. |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### create_application

Scaffold a full React application with SSR and routing.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `appPath` | string | no | Application directory. (default: my-app) |
| `ssr` | boolean | no | Include SSR. (default: true) |
| `router` | boolean | no | Include router. (default: true) |
| `forms` | boolean | no | Include form components. (default: true) |
| `relay` | boolean | no | Include a Relay (GraphQL) data layer. (default: false) |
| `runInstall` | boolean | no | Install dependencies now. (default: false) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### create_component

Scaffold a React, Svelte, or Lit component.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `framework` | enum(react, svelte, lit) | no | Component framework. (one of: react, svelte, lit) (default: react) |
| `componentPath` | string | no | Component path (its final segment is the PascalCase component name). |
| `withStyles` | boolean | no | Include styles. (default: true) |
| `withStories` | boolean | no | Include Storybook stories. (default: true) |
| `withSsrTests` | boolean | no | Include SSR tests. (default: true) |
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
| `withCli` | boolean | no | Include a CLI binary entry point. (default: false) |
| `withPrTemplate` | boolean | no | Include a PR template. (default: false) |
| `runInstall` | boolean | no | Run the package manager install after creation. (default: false) |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

### doctor

Runs nine diagnostic checks and reports pass/fail/skip with inline remedies. Storeless by default; the store check boots lazily and never fails the run.

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

### ontology_show

Show a namespace's classes (hierarchy + counts) and properties.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `prefix` | string | yes | The namespace prefix (ds) or full URI. |
| `properties` | boolean | no | Include the properties section. |
| `fullUris` | boolean | no | Show full IRIs instead of prefixed. |
| `class` | string | no | Focus on one class and its properties. |

### prompt_list

Browse the ds:Prompt entities in the active graph — name, description, and argument names. The same prompts are offered natively over MCP prompts/list; use prompt_lookup for the full template body.

Read-only.

**Input**

_No input parameters._

### prompt_lookup

Fetch a single ds:Prompt entity's full template body (with {{arg}} placeholders) and its declared arguments.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | The prompt name (e.g. build-a-block). |

### setup

Runs the shell-completions, LSP, MCP, and skills installers as a single wizard: pick the steps, review the recap, then apply.

Mutation — plan-first (set `confirm: true` to apply). Non-destructive.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
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

Storeless — reads the lock, config, and pack cache without booting the store, so it works even when the store is cold.

Read-only.

**Input**

_No input parameters._

### sources_update

Resolves each configured package (git/file/npm), builds one content-addressed pack, and writes pragma.lock.json. Networkless boots then load from the lock.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `frozen` | boolean | no | Re-resolve to the lock's pinned revisions exactly; never advance. |
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

Look up a single tier by its name (e.g. apps/lxd) and list the blocks scoped directly to it.

Read-only.

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes | The tier name (e.g. apps/lxd). |

### token_add-config

Writes a terrazzo `defineConfig` at the project root, sourcing token JSON from the configured design-system packages. Store-backed so it reports how many tokens the active graph holds. Plan-first: returns the write plan until you confirm.

Mutation — plan-first (set `confirm: true` to apply).

**Input**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `confirm` | boolean | no | Set true to execute; otherwise a plan is returned (default false). |
| `cwd` | string | no | Absolute project directory to write into; defaults to the server's working directory. |

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

- **Resources**: `pragma:{+uri}` — entity reads addressed by URI (listing and autocomplete are storeless over the pack index).
- **Prompts**: the design system's workflow templates are offered natively over `prompts/list` and `prompts/get`, and as the `prompt_list` / `prompt_lookup` content tools.
- **Instructions**: the server always sends handshake instructions describing the conventions and the discovery sequence.
