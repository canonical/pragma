# CLI command reference

Every `pragma` command, grouped by noun. Generated from the live capability grammar — do not edit by hand.

Global flags apply to every command: `--format <plain|llm|json>` (auto-detected — the llm/condensed-Markdown form turns on when output is piped), `--verbose`, `--no-headers`, `--quiet`, and `--detail <summary|standard|detailed>`.

## block

### pragma block list

List all design system blocks.

List all design system blocks with their type, tier, and modifier families.

Use when asked which components, patterns, layouts or subcomponents exist — all four are blocks, and every one of them is read through the block tools.

```
pragma block list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--tier` | `<string>` | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `block_list` tool.

**Examples**

```bash
pragma block list
pragma block list --format llm
```

### pragma block lookup

Look up block details by name, IRI, or glob.

Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. `detail: "summary"` trims to the base view.

Use when asked about one component, pattern or layout by name — its anatomy, properties, variants, or when to use it.

```
pragma block lookup <name...> [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Block names, prefixed names/IRIs, or glob patterns. |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--tier` | `<string>` | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `block_lookup` tool.

**Examples**

```bash
pragma block lookup <name>
pragma block lookup --tier all <name>  # every tier, not just the ones in scope
```

### pragma block sample

Return randomly selected complete block entries as exemplars.

Return randomly selected complete design-system blocks as exemplars.

Use before your first block query, to see what a real block record looks like instead of guessing field names.

```
pragma block sample
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `block_sample` tool.

**Examples**

```bash
pragma block sample
```

## capabilities

### pragma capabilities

Discover pragma conventions, the annotated tool catalog, and the discovery sequence.

Storeless orientation for agents. Returns the conventions (KG / tier-channel / SPARQL model), a four-stage discovery sequence, and every live tool with a behavioural use_when hint and category — all derived from the live grammar, so it never drifts. Call it first at session start.

Use when unsure which tool answers a question.

```
pragma capabilities
```

- Store: storeless.
- MCP: exposed as the `capabilities` tool.

**Examples**

```bash
pragma capabilities  # the annotated tool catalog
pragma capabilities --format json  # the structured map
```

## colophon

### pragma colophon

Narrate how the active domain is made.

Storeless — the colophon each active pack declares for its domain. With no pack telling a story, it prints the one pragma declares for itself instead; with neither, it says so. Also available as a condensed Markdown narration for agents, or as a structured JSON projection of the sections.

Use when asked which packs the data comes from.

```
pragma colophon
```

- Store: storeless.
- MCP: exposed as the `colophon` tool.

**Examples**

```bash
pragma colophon  # the active domain's story
pragma colophon --format llm  # condensed Markdown for agents
```

## concept

### pragma concept list

List design-system concepts.

List design-system concepts — long-form foundations, how-to guides, and decision guides not bound to a single UI block. Optionally filter by type or search.

Use when asked for design guidance that is not about one component — foundations, how-to guides, decision guides.

```
pragma concept list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--type` | `<string>` | Filter by concept type (e.g. Explanation, How-to guide). |
| `--search` | `<string>` | Search in name and summary. |
| `--tier` | `<string>` | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `concept_list` tool.

**Examples**

```bash
pragma concept list
pragma concept list --format llm
```

### pragma concept lookup

Look up a concept's full documentation by name, IRI, or glob.

Get a design-system concept's full Markdown documentation. Address concepts by the name concept_list publishes, by prefixed name (ds:concept.…), by absolute IRI, or by a glob.

Use when asked to read one guide or foundation in full.

```
pragma concept lookup <name...> [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Concept names, prefixed names/IRIs, or glob patterns. |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--tier` | `<string>` | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `concept_lookup` tool.

**Examples**

```bash
pragma concept lookup <name>
pragma concept lookup --tier all <name>  # every tier, not just the ones in scope
```

## config

### pragma config get

Print one resolved config value.

Reads the effective value of a single field after layering — built-in defaults, the global config, and the nearest project config. Prints the bare value (nothing when the field is unset), so the output substitutes directly into a shell.

Use when asked for the value of one setting.

```
pragma config get <key>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<key>` | yes | The config field to read. (one of: tier, channel, detail) |

- Store: storeless.
- MCP: exposed as the `config_get` tool.

**Examples**

```bash
pragma config get tier
pragma config get channel --format json
```

### pragma config set

Set a config field by name.

Write a global config field by name. `key` is one of `tier`, `channel`, or `detail`; clearing a field is `config unset <key>`'s job, and the values that used to double as clear-markers are refused. Written to the global layer only — project configs are authored by hand.

Use when asked to change a setting, such as making one product's tier the default for every read.

```
pragma config set <key> <value>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<key>` | yes | The config field to write. (one of: tier, channel, detail) |
| `<value>` | yes | The value to write. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `config_set` tool.

**Examples**

```bash
pragma config set tier apps/lxd  # scope reads to a tier
pragma config set channel experimental
pragma config unset tier  # clear the tier
```

### pragma config show

Show the resolved config and per-field provenance.

Merges built-in defaults, the global XDG config, and the nearest pragma.config.ts, marking which layer supplied each value.

Use when asked how the tool is configured and which file set each value.

```
pragma config show
```

- Store: storeless.
- MCP: exposed as the `config_show` tool.

**Examples**

```bash
pragma config show
pragma config show --format json
```

### pragma config unset

Clear a config field by name.

Removes a field from the global config so the built-in default (or a project config) applies again. The counterpart of `config set` — setting writes a value, unsetting removes one; no value doubles as a remove-marker.

Use when asked to put a setting back to its built-in default.

```
pragma config unset <key>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<key>` | yes | The config field to clear. (one of: tier, channel, detail) |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `config_unset` tool.

**Examples**

```bash
pragma config unset tier  # read the full graph again
pragma config unset channel
```

## create

The `create` surface is a PROJECTION of the summon generator tree: `pragma create <path...>` ≡ `summon <path...>` over the declared bindings — same grammar, same flags, same wizard, byte-identical trees. Tree segments are subcommands (`create component react|svelte|lit`, `create application react`), and every flag derives from the generators' own prompts (a default-on confirm registers only its `--no-` form). The contract is EXECUTED, not written down: `crossCli.subprocess.test.ts` runs both CLIs over the same argv and compares what they emit.

### pragma create application

Scaffold a full React application with routing, and either server-side rendering or a client-only SPA.

Use when asked to start a new React application, server-rendered or client-only.

```
pragma create application react [app-path] [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `[app-path]` | no | Application directory name. (default: my-app) |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--no-forms` | — | Include form components. (default: true) |
| `--intl` | — | Include internationalisation (locale negotiation, translated UI, locale switcher). (default: false) |
| `--rendering` | `<ssr\|spa>` | Rendering — ssr keeps the server layer (SSR servers and sitemap), spa is client-only. (one of: ssr, spa) (default: ssr) |
| `--relay` | — | Include a Relay (GraphQL) data layer with a local mock schema. (default: false) |
| `--no-run-install` | — | Install dependencies now. (default: true) |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `create_application` tool.

**Examples**

```bash
pragma create application react my-app
pragma create application react my-app --relay
pragma create application react my-app --rendering spa
```

### pragma create component

Scaffold a React, Svelte, or Lit component.

Use when asked to start a new React, Svelte or Lit component with its tests, stories and styles.

```
pragma create component <framework> [component-path] [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<framework>` | yes | Component framework — the tree segment (`create component <framework>`). (one of: react, svelte, lit) |
| `[component-path]` | no | Component path. |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--no-with-styles` | — | Include styles. (default: true) |
| `--no-with-stories` | — | Include Storybook stories. (default: true) |
| `--no-with-ssr-tests` | — | Include SSR tests. (frameworks: react, svelte) (default: true) |
| `--use-ts-stories` | — | Use TypeScript stories format? (otherwise Svelte CSF). (frameworks: svelte) (default: false) |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `create_component` tool.

**Examples**

```bash
pragma create component react src/components/Button  # React component with tests, stories, and styles
pragma create component svelte src/lib/Card --dry-run  # preview the files without writing
```

### pragma create package

Scaffold a new npm package for the monorepo.

Use when asked to start a new npm package inside the monorepo.

```
pragma create package [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--name` | `<string>` | Package name. (default: @canonical/my-package) |
| `--type` | `<tool-ts\|library\|css>` | Package type. (one of: tool-ts, library, css) (default: tool-ts) |
| `--description` | `<string>` | Package description. (default: ) |
| `--framework` | `<none\|react\|svelte>` | UI framework (library packages only). (one of: none, react, svelte) (default: none) |
| `--with-storybook` | — | Include Storybook setup. (default: false) |
| `--with-cli` | — | Include CLI binary entry point. (default: false) |
| `--with-pr-template` | — | Include a .github/PULL_REQUEST_TEMPLATE.md. (default: false) |
| `--no-run-install` | — | Run package manager install after creation. (default: true) |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `create_package` tool.

**Examples**

```bash
pragma create package --name @canonical/my-lib --type library
pragma create package --name @canonical/my-tool --no-run-install
```

## doctor

### pragma doctor

Check your environment and every setup target, globally and in this project.

Reports the environment checks first, then one row per setup target — once for your home directory, once for this project. Each row is pass, fail, available (an optional integration you have not set up yet), or skip (nothing to do here, and the row says why), with the next step printed inline. Every row is named after the setup target that repairs it, except `harnesses`: a listing, per scope, of the AI harnesses found on this machine and whether this CLI's MCP server is registered in each — the ones actually found, or every harness it knows about under the verbose global flag. Needs no store; the store check boots lazily and never fails the run.

Use when something is not working, to find out what.

```
pragma doctor
```

- Store: storeless.
- MCP: exposed as the `doctor` tool.

**Examples**

```bash
pragma doctor
pragma doctor --format json  # machine-readable checks
```

## graph

### pragma graph connect

Show the shortest relation paths between two entities.

Finds every shortest path of RELATION edges between two entities, and says which kind of nothing it found when there is no path. An edge counts as a relation only where it does not fan out into a roster — membership of a class, a tier or a family is answered by that noun's list verb, not by a path — so most pairs are correctly reported as unconnected. Address each endpoint by prefixed name (ds:global.component.button) or absolute IRI. Every answer states the hop limit, the fan-in threshold, and the packs searched.

Use when asked whether and how two things are related.

```
pragma graph connect <a> <b> [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<a>` | yes | The first endpoint — a prefixed name or absolute IRI. |
| `<b>` | yes | The second endpoint — a prefixed name or absolute IRI. |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--hops` | `<number>` | Largest path length to return (default 4, ceiling 6). (default: 4) |
| `--paths` | `<number>` | Most shortest paths to show (default 10); the answer always reports the true total. (default: 10) |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `graph_connect` tool.

**Examples**

```bash
pragma graph connect ds:global.component.button dt:color.text  # a block and a token symbol
pragma graph connect ds:global.component.button ds:apps.pattern.datatable --format json  # an honest unlinked answer, with the policy it was found under
```

### pragma graph inspect

Show every triple where a URI is the subject, grouped by predicate.

Inspect one entity: all predicate/object pairs asserted on the subject. Address it by prefixed name (ds:global.component.button) or absolute IRI.

Use when asked for everything recorded about one identifier.

```
pragma graph inspect <uri>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<uri>` | yes | The subject URI — a prefixed name or absolute IRI. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `graph_inspect` tool.

**Examples**

```bash
pragma graph inspect ds:global.component.button
pragma graph inspect https://ds.canonical.com/global.component.button
```

### pragma graph query

Run a raw SPARQL query against the loaded graph.

Executes an arbitrary SPARQL query (SELECT / ASK / CONSTRUCT) against the store. Prefixes are applied automatically from the pack's namespace map; list the ontology namespaces to discover the available prefixes.

Use only when no other tool answers: SPARQL joins or counts.

```
pragma graph query <sparql>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<sparql>` | yes | The SPARQL query text (SELECT, ASK, or CONSTRUCT). |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `graph_query` tool.

**Examples**

```bash
pragma graph query "SELECT ?s WHERE { ?s a ds:Component }"  # list every component subject
pragma graph query "ASK { <https://ds.canonical.com/global.component.button> a ds:Component }" --format json
```

## implementation

### pragma implementation libraries

List the implementation libraries.

List the design-system implementation libraries — platform, tier, released version, and how many blocks each one implements.

Use when asked which component libraries exist and what each covers.

```
pragma implementation libraries [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `implementation_libraries` tool.

**Examples**

```bash
pragma implementation libraries
pragma implementation libraries --format llm
```

### pragma implementation list

List which library implements which design-system block.

List the implementations of design-system blocks — which library implements which block, on which platform, and the source file it lives in. Optionally filter by platform or library, or search.

Use when asked whether a component is implemented in React, Svelte or another library, or where its source code lives.

```
pragma implementation list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--platform` | `<string>` | Filter by platform (e.g. react, svelte, typescript). |
| `--library` | `<string>` | Filter by implementation library name. |
| `--search` | `<string>` | Search in block and library name. |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `implementation_list` tool.

**Examples**

```bash
pragma implementation list
pragma implementation list --format llm
```

## info

### pragma info

Show version, resolved config, provenance, and update status.

Storeless — reports the CLI version, how it was installed, the layered config with per-field origins, an entity total from the pack index, and (network, silent-fail) whether a newer release is available.

Use when asked which version is installed or whether an update exists.

```
pragma info
```

- Store: storeless.
- MCP: exposed as the `info` tool.

**Examples**

```bash
pragma info  # human-readable summary
pragma info --format json  # the full {ok,data,meta} envelope
```

## mcp

### pragma mcp serve

Start the MCP server over stdio.

Use when an MCP client needs to launch this server; people rarely run it by hand.

```
pragma mcp serve
```

- Store: storeless.
- MCP: not exposed (CLI-only).

## modifier

### pragma modifier list

List all modifier families.

List all modifier families with their values.

Use when asked which variants or options components can take — importance, size, density and the like — and the values each allows.

```
pragma modifier list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--tier` | `<string>` | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `modifier_list` tool.

**Examples**

```bash
pragma modifier list
pragma modifier list --format llm
```

### pragma modifier lookup

Look up modifier details by name, IRI, or glob.

Get values and usage details for one or more modifier families by name.

Use when asked which values one option allows, such as the levels of importance.

```
pragma modifier lookup <name...> [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Modifier names, prefixed names/IRIs, or glob patterns. |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--tier` | `<string>` | Read this tier and its ancestors (default: the top-level tiers; "all" for every tier). |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `modifier_lookup` tool.

**Examples**

```bash
pragma modifier lookup <name>
pragma modifier lookup --tier all <name>  # every tier, not just the ones in scope
```

### pragma modifier sample

Return randomly selected complete modifier entries as exemplars.

Return randomly selected complete modifier families (with value lists) as exemplars.

Use before your first modifier query, to see what a real modifier family record looks like.

```
pragma modifier sample
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `modifier_sample` tool.

**Examples**

```bash
pragma modifier sample
```

## ontology

### pragma ontology list

List loaded ontology namespaces with class and property counts.

Use when asked which vocabularies (namespaces and their prefixes) the data uses — the first step before writing a raw query.

```
pragma ontology list
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `ontology_list` tool.

**Examples**

```bash
pragma ontology list
```

### pragma ontology lookup

Look up a namespace's classes (hierarchy + counts) and properties.

Use before writing a raw query, to find the real class and property names under one prefix.

```
pragma ontology lookup <prefix> [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<prefix>` | yes | The namespace prefix (ds) or full URI. |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--properties` | — | Include the properties section (also implied by --detail standard or higher). |
| `--full-uris` | — | Show full IRIs instead of prefixed. |
| `--class` | `<string>` | Focus on one class and its properties. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `ontology_lookup` tool.

**Examples**

```bash
pragma ontology lookup ds
pragma ontology lookup ds --properties
pragma ontology lookup ds --class Component
```

## prompt

### pragma prompt list

List the workflow prompt templates the design system offers.

Browse the prompt entities the active graph declares (ds:Prompt in this distribution) — name, description, and argument names. This distribution's graph carries none today. The same prompts are offered natively over MCP prompts/list; use prompt_lookup for the full template body.

Use when asked which ready-made workflow prompts the design system offers.

```
pragma prompt list
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `prompt_list` tool.

**Examples**

```bash
pragma prompt list
```

### pragma prompt lookup

Show one workflow prompt template's body and arguments by name.

Fetch a single prompt entity's full template body (with {{arg}} placeholders) and its declared arguments. A prompt is addressed by its label; prompt_list names the ones the active graph carries.

Use when asked to read or run one workflow prompt by the name prompt_list gave.

```
pragma prompt lookup <name>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name>` | yes | The prompt name, as `prompt list` reports it. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `prompt_lookup` tool.

## setup

### pragma setup completions

Install TAB completion for the shell you are running.

Use when asked to install only TAB completion for the shell.

```
pragma setup completions [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Where to configure: global (your home directory, the default), project (this repository), or both. (one of: project, global, both) (default: global) |
| `--global` | — | Shorthand for --scope global — configure your home directory. |
| `--local` | — | Shorthand for --scope project — configure this project only. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

### pragma setup config

Create your global config file, filled in with the defaults.

Use when asked to create only the global config file.

```
pragma setup config [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Where to configure: global (your home directory, the default), project (this repository), or both. (one of: project, global, both) (default: global) |
| `--global` | — | Shorthand for --scope global — configure your home directory. |
| `--local` | — | Shorthand for --scope project — configure this project only. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

### pragma setup lsp

Install the Terrazzo design-token extension into the VS Code-family editors on this machine (on PATH, under /Applications or ~/Applications, or by its user directory).

Use when asked to install only the design-token editor extension.

```
pragma setup lsp [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Where to configure: global (your home directory, the default), project (this repository), or both. (one of: project, global, both) (default: global) |
| `--global` | — | Shorthand for --scope global — configure your home directory. |
| `--local` | — | Shorthand for --scope project — configure this project only. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

### pragma setup mcp

Register the pragma MCP server with the AI harnesses on this machine.

Use when asked to connect only the MCP server to the AI tools on this machine.

```
pragma setup mcp [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Where to configure: global (your home directory, the default), project (this repository), or both. (one of: project, global, both) (default: global) |
| `--global` | — | Shorthand for --scope global — configure your home directory. |
| `--local` | — | Shorthand for --scope project — configure this project only. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

### pragma setup

Set up your config file, TAB completion, the editor extension, MCP, and skills.

Shows what each target needs, then applies the ones you keep. Everything is configured in your home directory by default; the scope option moves the run to this project alone, or covers both. Without an attended terminal the plan is printed and nothing is written unless the run is explicitly confirmed.

Use when asked to install or repair the tool's integration: the config file, shell completions, MCP registration, skills and the editor extension.

```
pragma setup [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Where to configure: global (your home directory, the default), project (this repository), or both. (one of: project, global, both) (default: global) |
| `--global` | — | Shorthand for --scope global — configure your home directory. |
| `--local` | — | Shorthand for --scope project — configure this project only. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `setup` tool.

**Examples**

```bash
pragma setup
pragma setup --dry-run  # show the plan, write nothing
pragma setup --local  # configure this project instead of your home directory
pragma setup mcp  # only register the MCP server
```

### pragma setup skills

Link the skills you have installed into every AI harness that reads them.

Use when asked to make only the installed skills visible to the AI tools on this machine.

```
pragma setup skills [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Where to configure: global (your home directory, the default), project (this repository), or both. (one of: project, global, both) (default: global) |
| `--global` | — | Shorthand for --scope global — configure your home directory. |
| `--local` | — | Shorthand for --scope project — configure this project only. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

## skill

### pragma skill list

List discovered skills (SKILL.md files under the skill roots).

Use when asked which agent skills (guided workflows) are available.

```
pragma skill list
```

- Store: storeless.
- MCP: exposed as the `skill_list` tool.

**Examples**

```bash
pragma skill list
```

### pragma skill lookup

Show a skill's metadata and instructions by name.

Use when asked to follow one skill.

```
pragma skill lookup <name>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name>` | yes | The skill name. |

- Store: storeless.
- MCP: exposed as the `skill_lookup` tool.

**Examples**

```bash
pragma skill lookup docx
```

## sources

### pragma sources reset

Remove this project's built pack.

Deletes the pointer that names the pack this project reads, so reads answer from the snapshot shipped with the CLI again; a project that declares its own packs cannot answer reads until the next `sources update`. The cached pack files are left alone — they are shared with any other project built from the same sources, and a later update reuses them. Reports calmly when nothing is built.

Use to discard locally built data and return to the data shipped with the tool.

```
pragma sources reset
```

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `sources_reset` tool.

**Examples**

```bash
pragma sources reset  # drop the built pack and read the shipped snapshot
pragma sources reset --dry-run  # show what would be removed
```

### pragma sources status

Report which pack answers reads, and the packs it was built from.

Storeless — reads config and the pack cache without booting the store, so it works even when the store is cold. Reports whether reads are answered by a locally built pack, by the embedded snapshot, or not at all.

Use when results look empty or stale, to see which data pack is answering.

```
pragma sources status
```

- Store: storeless.
- MCP: exposed as the `sources_status` tool.

**Examples**

```bash
pragma sources status  # human-readable readiness summary
pragma sources status --format json  # the full envelope
```

### pragma sources update

Resolve configured packs and build the local store from them.

Resolves each configured pack (git, file, or npm) and builds one local pack from them, which every later run reads without touching the network. Put a commit SHA in a pack source ref to pin it to that revision.

Use when asked to fetch or rebuild the design-system data, or when a read reports that the store is unavailable.

```
pragma sources update [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--skip-invalid` | — | Build from the sources that parse, warning about each one that does not, instead of failing the whole update. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `sources_update` tool.

**Examples**

```bash
pragma sources update  # resolve and build
pragma sources update --skip-invalid  # build from the sources that parse, and name the ones dropped
```

## standard

### pragma standard categories

List all standard categories with counts (a parent counts its whole branch).

List all code standard categories with the number of standards each covers. Categories are a hierarchy: a parent's count includes every descendant, and `standard_list { category }` answers for the same set. Use this to pick a valid slug before filtering.

Use when asked which areas the code standards cover.

```
pragma standard categories [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `standard_categories` tool.

**Examples**

```bash
pragma standard categories
pragma standard categories --format llm
```

### pragma standard list

List all code standards.

List code standards: one ROW per standard — its IRI, name, category and description — not the standards themselves. Take a row's `name` VERBATIM to standard_lookup for the dos and donts. Optionally filter by category slug (a parent slug answers for its whole branch; standard_categories lists them) or by search term.

Use when asked which coding rules or conventions apply — for React, CSS, testing, documentation and so on.

```
pragma standard list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--category` | `<string>` | Filter by category slug. A parent category answers for its whole branch. |
| `--search` | `<string>` | Search in name and description. |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `standard_list` tool.

**Examples**

```bash
pragma standard list
pragma standard list --format llm
```

### pragma standard lookup

Look up one or more standards by name, IRI, or glob. --detail standard adds the dos, --detail detailed adds the don'ts.

Get one or more code standards in full, with dos and don'ts as code examples. `detail` DEFAULTS to "summary", which returns neither: pass detail: "standard" for the dos and detail: "detailed" for dos AND don'ts. Address a standard by the name standard_list publishes (`react/component/tsdoc`), by prefixed name (`cs:react.component.tsdoc`), by absolute IRI, or by a glob over any of those.

Use when asked how code should be written under one rule.

```
pragma standard lookup <name...>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Standard names, prefixed names/IRIs, or glob patterns. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `standard_lookup` tool.

**Examples**

```bash
pragma standard lookup <name>
```

### pragma standard sample

Return randomly selected complete standard instances as exemplars for shape discovery.

Return 1–5 randomly selected complete code standard instances as exemplars. Each call returns different instances.

Use before your first standards query, to see what a real code standard record looks like.

```
pragma standard sample [count]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `[count]` | no | Number of samples (1–5, default 2). |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `standard_sample` tool.

**Examples**

```bash
pragma standard sample
pragma standard sample 3
```

## tier

### pragma tier list

List all tiers in the design system ontology.

List all tiers in the design-system ontology. The `tier` parameter scopes a read to one tier plus its ancestors, and this list is never scoped itself.

Use when asked which tiers the design system has — global, apps, a single product — or before passing `tier` to another tool.

```
pragma tier list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `tier_list` tool.

**Examples**

```bash
pragma tier list
pragma tier list --format llm
```

### pragma tier lookup

Show tiers by name, with the blocks scoped to each.

Get one or more tiers by name, with the blocks scoped directly to each.

Use when asked which components belong to one tier or product.

```
pragma tier lookup <name...>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Tier names, prefixed names/IRIs, or glob patterns. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `tier_lookup` tool.

**Examples**

```bash
pragma tier lookup <name>
```

## token

### pragma token consumers

List which blocks consume which token symbol, at which style key, state and rank.

List the token BINDINGS the design system records — which block consumes which symbol, at which style key, state, rank and node. Every column is identity: two bindings differing only in state are different facts. The block is the CONSUMING block; via names the block whose anatomy the binding was authored in, and is blank when that is the consuming block itself. Name the symbol by its dotted name (symbol) or by a CSS variable standing for it (variable); narrow to the components a name reaches, or to one by IRI, with block. Answers empty until the packs record bindings.

Use when asked which components use a token, or what changing one affects.

```
pragma token consumers [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--block` | `<string>` | Filter to the blocks a name reaches (every tier), or to one block by IRI. |
| `--symbol` | `<string>` | Filter to one symbol. |
| `--variable` | `<string>` | A CSS variable name for the consumed symbol — the other spelling of the symbol parameter. A channel variable and its semantic sibling differ. |
| `--key` | `<string>` | Filter to one style key. |
| `--state` | `<string>` | Filter to one interaction state. |
| `--search` | `<string>` | Search block, via, symbol, key, state and node. |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `token_consumers` tool.

**Examples**

```bash
pragma token consumers
pragma token consumers --format llm
```

### pragma token list

List the design-token symbols.

List the design-token SYMBOLS — logical dotted names (`color.text`), with the type and description from the symbol's OWN definition, and the symbol a channel provisions. The CSS custom-property names a stylesheet declares are variable_list.

Use when asked which design tokens exist — colours, spacing, typography — or to find a token's exact name.

```
pragma token list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--type` | `<string>` | Filter by type. |
| `--channel-of` | `<string>` | Filter to one symbol's channels. |
| `--search` | `<string>` | Search name and description. |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `token_list` tool.

**Examples**

```bash
pragma token list
pragma token list --format llm
```

### pragma token lookup

Look up one or more token symbols by dotted name, IRI, or glob.

Get one design-token symbol in full: its own type and description, every definition behind it with that definition's own type and description, the modifier families that may rebind it, and the value it resolves to at each position. Address it by the dotted name token_list publishes (`color.text`), by prefixed name, by IRI, or by a glob.

Use when asked everything about one token by name: where it is defined, what can change it, and its values.

```
pragma token lookup <name...>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Token names, prefixed names/IRIs, or glob patterns. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `token_lookup` tool.

**Examples**

```bash
pragma token lookup <name>
```

### pragma token sample

Return randomly selected complete token entries as exemplars.

Return random complete design-token symbols — definitions, coverage and resolved values — as exemplars.

Use before your first token query, to see what a real token record looks like.

```
pragma token sample
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `token_sample` tool.

**Examples**

```bash
pragma token sample
```

### pragma token values

List the value each symbol resolves to at each position, with its chain or its derivation.

List the resolved token VALUES — one row per (symbol, position) the graph materialises, with the value and either its resolution chain or the symbol it derives from. Only MATERIALISED positions appear, not the permutation space: a position with no row falls through to the base symbol. A derived row carries a derivation and no value cell.

Use when asked what value a token has, in light, dark or any other mode.

```
pragma token values [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--symbol` | `<string>` | Filter to one symbol. |
| `--position` | `<string>` | Filter to one position. |
| `--search` | `<string>` | Search symbol, value, derivation. |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `token_values` tool.

**Examples**

```bash
pragma token values
pragma token values --format llm
```

## upgrade

### pragma upgrade

Upgrade the pragma CLI to the latest version.

Checks the registry for the active channel's latest release and runs your package manager's global-update command. Preview the update before applying it.

Use when asked to update the CLI itself to the latest release.

```
pragma upgrade
```

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `upgrade` tool.

**Examples**

```bash
pragma upgrade
pragma upgrade --dry-run  # show the delta and the command
```

## variable

### pragma variable chain

List the walk from a variable to every symbol it reaches, through every variable in between.

List the resolution WALK: every (variable, symbol) pair a variable reaches through what its declarations reference, transitively — what a variable finally means. The closure runs over every declaration of every hop, so one variable can reach dozens of pairs.

Use when asked which tokens a CSS variable ends up referring to.

```
pragma variable chain [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--variable` | `<string>` | Filter to one variable. |
| `--symbol` | `<string>` | Filter to one symbol. |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `variable_chain` tool.

**Examples**

```bash
pragma variable chain
pragma variable chain --format llm
```

### pragma variable list

List the platform variables the design tokens are emitted as.

List the platform VARIABLES a stylesheet declares as CSS custom properties, with the symbol each stands for, its tier, visibility and the coordinates it is selected at. 236 stand for no symbol, so token_list cannot reach them. Address one WITHOUT its leading dashes (`color-text`).

Use when asked which CSS custom properties (variables) exist, or which CSS variable stands for a token.

```
pragma variable list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--platform` | `<string>` | Filter by platform. |
| `--symbol` | `<string>` | Filter to one symbol. |
| `--tier` | `<string>` | Filter by tier. |
| `--visibility` | `<string>` | Filter by visibility. |
| `--coordinate` | `<string>` | Filter to one coordinate. |
| `--search` | `<string>` | Search name and symbol. |
| `--limit` | `<number>` | Maximum rows to return, 1 to 40000 (default 300). |
| `--after` | `<string>` | Continue from a previous page: the cursor that page reported. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `variable_list` tool.

**Examples**

```bash
pragma variable list
pragma variable list --format llm
```

### pragma variable lookup

Look up one or more platform variables by name (without the leading dashes), IRI, or glob.

Get one platform variable in full: its symbol, tier, visibility, and EVERY place it is declared — the selector and at-rule stack, the emitted value, the source location, the coordinate it also applies at, and the derivation. Address it by the CSS name WITHOUT its leading dashes (`color-text`).

Use when asked about one CSS variable by name: what it stands for and everywhere it is declared.

```
pragma variable lookup <name...>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Variable names, prefixed names/IRIs, or glob patterns. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `variable_lookup` tool.

**Examples**

```bash
pragma variable lookup <name>
```

### pragma variable sample

Return randomly selected complete variable entries as exemplars.

Return random complete platform variables — symbol, tier, visibility and every declaration — as exemplars.

Use before your first variable query, to see what a real CSS variable record looks like.

```
pragma variable sample
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `variable_sample` tool.

**Examples**

```bash
pragma variable sample
```

## version

### pragma version

Print the CLI version.

Prints the version `--version` prints — one value, two spellings of the same read.

Use when asked only for the installed version number.

```
pragma version
```

- Store: storeless.
- MCP: not exposed (CLI-only).

**Examples**

```bash
pragma version
```
