# CLI command reference

Every `pragma` command, grouped by noun. Generated from the live capability grammar — do not edit by hand.

Global flags apply to every command: `--format <plain|llm|json>` (auto-detected — the llm/condensed-Markdown form turns on when output is piped), `--verbose`, and `--detail <summary|standard|detailed>`.

## block

### pragma block list

List blocks visible under the current tier and channel.

List design system blocks visible under the active tier chain and channel. Optionally list across every tier, ignoring the tier filter.

```
pragma block list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--all-tiers` | — | Show blocks from all tiers, ignoring the tier filter. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `block_list` tool.

**Examples**

```bash
pragma block list
pragma block list --all-tiers
pragma block list --format llm
```

### pragma block lookup

Look up block details by name, IRI, or glob.

Get detailed information about one or more design system blocks including anatomy, modifiers, and properties. Use when you need the full spec of specific blocks by name — detail: "summary" trims to the base view. Example: block_lookup { names: ["Button"] }.

```
pragma block lookup <name...>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Block names, prefixed names/IRIs, or glob patterns. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `block_lookup` tool.

**Examples**

```bash
pragma block lookup <name>
```

### pragma block sample

Return randomly selected complete block entries as exemplars.

Return randomly selected complete design-system blocks as exemplars. Use BEFORE writing queries to see actual data shapes, anatomy, and property names.

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

Narrate how pragma and the active domain are made.

Storeless — a colophon for the toolchain. Prints pragma's own story (the effect monad, one-grammar-many-projections, the render/LLM-output model, storeless modularity, and the domain-as-data pack model) followed by the active pack's domain colophon. Also available as a condensed Markdown narration for agents, or as a structured JSON projection of the sections.

```
pragma colophon
```

- Store: storeless.
- MCP: exposed as the `colophon` tool.

**Examples**

```bash
pragma colophon  # the toolchain + active domain story
pragma colophon --format llm  # condensed Markdown for agents
```

## config

### pragma config set

Set a config field by name.

Write a global config field by name — the one-command form of the per-field setters. `key` is one of `tier`, `channel`, or `detail`; the field's own reset rules apply (e.g. `set tier none` clears it). Written to the global layer only — project configs are authored by hand.

```
pragma config set <key> <value>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<key>` | yes | The config field to write. (one of: tier, channel, detail) |
| `<value>` | yes | The value to write (or a field's reset sentinel, e.g. `none`). |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `config_set` tool.

**Examples**

```bash
pragma config set tier apps/lxd  # scope reads to a tier
pragma config set channel experimental
pragma config set tier none  # clear the tier
```

### pragma config show

Show the resolved config and per-field provenance.

Merges built-in defaults, the global XDG config, and the nearest pragma.config.ts, marking which layer supplied each value.

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

## create

### pragma create application

Scaffold a full React application with SSR and routing.

```
pragma create application [appPath] [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `[appPath]` | no | Application directory. (default: my-app) |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--with-ssr` | — | Include SSR. (default: true) |
| `--with-router` | — | Include router. (default: true) |
| `--with-forms` | — | Include form components. (default: true) |
| `--with-relay` | — | Include a Relay (GraphQL) data layer. (default: false) |
| `--run-install` | — | Install dependencies now. (default: false) |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `create_application` tool.

**Examples**

```bash
pragma create application my-app
pragma create application my-app --with-relay
```

### pragma create component

Scaffold a React, Svelte, or Lit component.

```
pragma create component [componentPath] [options]
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `[componentPath]` | no | Component path (its final segment is the PascalCase component name). |

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--framework` | `<react\|svelte\|lit>` | Component framework (react, svelte, or lit). (one of: react, svelte, lit) |
| `--with-styles` | — | Include styles. (default: true) |
| `--with-stories` | — | Include Storybook stories. (default: true) |
| `--with-ssr-tests` | — | Include SSR tests. (default: true) |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `create_component` tool.

**Examples**

```bash
pragma create component src/components/Button --framework react  # React component with tests, stories, and styles
pragma create component src/lib/Card --framework svelte --dry-run  # preview the files without writing
```

### pragma create package

Scaffold a new npm package for the monorepo.

```
pragma create package [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--name` | `<string>` | Package name. (default: @canonical/my-package) |
| `--type` | `<tool-ts\|library\|css>` | Package type. (one of: tool-ts, library, css) (default: tool-ts) |
| `--description` | `<string>` | Package description. (default: ) |
| `--with-react` | — | Include React dependencies. (default: false) |
| `--with-storybook` | — | Include Storybook setup. (default: false) |
| `--with-cli` | — | Include a CLI binary entry point. (default: false) |
| `--with-pr-template` | — | Include a PR template. (default: false) |
| `--run-install` | — | Run the package manager install after creation. (default: false) |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `create_package` tool.

**Examples**

```bash
pragma create package --name @canonical/my-lib --type library
pragma create package --name @canonical/my-tool --run-install
```

## doctor

### pragma doctor

Check environment health — Node, config, store, MCP, and skills.

Runs nine diagnostic checks and reports pass/fail/skip with inline remedies. Storeless by default; the store check boots lazily and never fails the run.

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

### pragma graph inspect

Show every triple where a URI is the subject, grouped by predicate.

Inspect one entity: all predicate/object pairs asserted on the subject. Address it by prefixed name (ds:button) or absolute IRI.

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
pragma graph inspect ds:button
pragma graph inspect https://ds.canonical.com/button
```

### pragma graph query

Run a raw SPARQL query against the loaded graph.

Executes an arbitrary SPARQL query (SELECT / ASK / CONSTRUCT) against the store. Prefixes are applied automatically from the pack's namespace map; list the ontology namespaces to discover the available prefixes.

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
pragma graph query "ASK { ds:button a ds:Component }" --format json
```

## info

### pragma info

Show version, resolved config, provenance, and update status.

Storeless — reports the CLI version, how it was installed, the layered config with per-field origins, an entity total from the pack index, and (network, silent-fail) whether a newer release is available.

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

## modifier

### pragma modifier list

List all modifier families.

List all modifier families with their values. Use when browsing which modifier families exist and the values each allows. Example: modifier_list {}.

```
pragma modifier list
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `modifier_list` tool.

**Examples**

```bash
pragma modifier list
pragma modifier list --format llm
```

### pragma modifier lookup

Look up modifier details by name, IRI, or glob.

Get values and usage details for one or more modifier families by name. Use when you need the allowed values of specific families. Example: modifier_lookup { names: ["importance"] }.

```
pragma modifier lookup <name...>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name...>` | yes | Modifier names, prefixed names/IRIs, or glob patterns. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `modifier_lookup` tool.

**Examples**

```bash
pragma modifier lookup <name>
```

### pragma modifier sample

Return randomly selected complete modifier entries as exemplars.

Return randomly selected complete modifier families (with value lists) as exemplars. Use BEFORE writing queries to see actual data shapes.

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

### pragma ontology show

(deprecated: use `ontology lookup`) Show a namespace's classes (hierarchy + counts) and properties.

Deprecated alias of `ontology lookup` — retained for compatibility. Prefer `ontology lookup <prefix>`.

```
pragma ontology show <prefix> [options]
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
- MCP: exposed as the `ontology_show` tool.

**Examples**

```bash
pragma ontology lookup ds  # prefer `lookup`
pragma ontology show ds  # deprecated alias
```

## prompt

### pragma prompt list

List the workflow prompt templates the design system offers.

Browse the ds:Prompt entities in the active graph — name, description, and argument names. The same prompts are offered natively over MCP prompts/list; use prompt_lookup for the full template body.

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

Fetch a single ds:Prompt entity's full template body (with {{arg}} placeholders) and its declared arguments.

```
pragma prompt lookup <name>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name>` | yes | The prompt name (e.g. build-a-block). |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `prompt_lookup` tool.

**Examples**

```bash
pragma prompt lookup build-a-block
```

## setup

### pragma setup completions

Install the shell-completion script for your shell.

```
pragma setup completions
```

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

### pragma setup lsp

Ensure the Terrazzo LSP VS Code extension is installed.

```
pragma setup lsp
```

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

### pragma setup mcp

Register the pragma MCP server in detected AI harnesses.

```
pragma setup mcp [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Which config band(s) to configure: project, global, or both. (one of: project, global, both) (default: both) |
| `--global` | — | Shorthand for --scope global (configure the user/home band). |
| `--local` | — | Shorthand for --scope project (configure the per-project band). |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

### pragma setup

Configure MCP, completions, skills, and the LSP for this project.

Runs the shell-completions, LSP, MCP, and skills installers as a single wizard: pick the steps, review the recap, then apply. The scope option targets the project band, the user/home band, or both.

```
pragma setup [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Which config band(s) to configure: project, global, or both. (one of: project, global, both) (default: both) |
| `--global` | — | Shorthand for --scope global (configure the user/home band). |
| `--local` | — | Shorthand for --scope project (configure the per-project band). |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `setup` tool.

**Examples**

```bash
pragma setup
pragma setup --dry-run  # preview every step's effects
pragma setup --global  # configure only the user/home band
pragma setup mcp  # just the MCP server registration
```

### pragma setup skills

Symlink discovered skills into each AI harness.

```
pragma setup skills [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--scope` | `<project\|global\|both>` | Which config band(s) to configure: project, global, or both. (one of: project, global, both) (default: both) |
| `--global` | — | Shorthand for --scope global (configure the user/home band). |
| `--local` | — | Shorthand for --scope project (configure the per-project band). |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: not exposed (CLI-only).

## skill

### pragma skill list

List discovered skills (SKILL.md files under the skill roots).

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

### pragma sources status

Report the local store's readiness and per-source staleness.

Storeless — reads the lock, config, and pack cache without booting the store, so it works even when the store is cold.

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

Resolve configured packages, build the local store, and lock it.

Resolves each configured package (git/file/npm), builds one content-addressed pack, and writes pragma.lock.json. Networkless boots then load from the lock.

```
pragma sources update [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--frozen` | — | Re-resolve to the lock's pinned revisions exactly; never advance. |
| `--skip-invalid` | — | Skip sources that fail to parse (warning about each) and build from the rest, instead of failing the whole update. |

- Store: storeless.
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `sources_update` tool.

**Examples**

```bash
pragma sources update  # resolve, build, and lock
pragma sources update --frozen  # reproduce the locked state
pragma sources update --skip-invalid  # build from the parseable sources, warning about any dropped
```

## standard

### pragma standard categories

List all standard categories with counts.

List all code standard categories.

```
pragma standard categories
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `standard_categories` tool.

**Examples**

```bash
pragma standard categories
pragma standard categories --format llm
```

### pragma standard list

List all code standards.

List code standards. Optionally filter by category or search term.

```
pragma standard list [options]
```

**Flags**

| Flag | Value | Description |
| --- | --- | --- |
| `--category` | `<string>` | Filter by category name. |
| `--search` | `<string>` | Search in name and description. |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `standard_list` tool.

**Examples**

```bash
pragma standard list
pragma standard list --format llm
```

### pragma standard lookup

Look up detailed information for a standard by name, IRI, or glob.

Get detailed information about one or more code standards including dos and donts with code examples. Address standards by name, prefixed name (cs:…), absolute IRI, or glob pattern (react/component/*).

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

Return 1–5 randomly selected complete code standard instances as exemplars. Use BEFORE writing queries to see actual data shapes, property names, and value formats. Each call returns different instances.

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

List all tiers in the design-system ontology. Use when understanding the tier hierarchy before setting a tier filter. Example: tier_list {}.

```
pragma tier list
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `tier_list` tool.

**Examples**

```bash
pragma tier list
pragma tier list --format llm
```

### pragma tier lookup

Show one tier by name, with the blocks scoped to it.

Look up a single tier by its name (e.g. apps/lxd) and list the blocks scoped directly to it.

```
pragma tier lookup <name>
```

**Arguments**

| Argument | Required | Description |
| --- | --- | --- |
| `<name>` | yes | The tier name (e.g. apps/lxd). |

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `tier_lookup` tool.

**Examples**

```bash
pragma tier lookup apps/lxd
```

## token

### pragma token add-config

Generate a tokens.config.mjs for the terrazzo token pipeline.

Writes a terrazzo `defineConfig` at the project root, sourcing token JSON from the configured design-system packages. Store-backed so it reports how many tokens the active graph holds. Plan-first: returns the write plan until you confirm.

```
pragma token add-config
```

- Store: reads the local store (`pragma sources update` builds it).
- Mutation: plan-first — preview with `--dry-run`, apply with `--yes`, reverse with `--undo`.
- MCP: exposed as the `token_add-config` tool.

**Examples**

```bash
pragma token add-config --dry-run  # preview the write
pragma token add-config --yes  # write the config
```

### pragma token list

List all design tokens.

List all design tokens with their type. Use when browsing which tokens exist under the active scope. Example: token_list {}.

```
pragma token list
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `token_list` tool.

**Examples**

```bash
pragma token list
pragma token list --format llm
```

### pragma token lookup

Look up token details by name, IRI, or glob.

Get type and theme values for one or more design tokens by name. Use when resolving specific tokens' light/dark values. Example: token_lookup { names: ["color.primary"] }.

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

Return randomly selected complete design tokens (with theme values) as exemplars. Use BEFORE writing queries to see actual data shapes.

```
pragma token sample
```

- Store: reads the local store (`pragma sources update` builds it).
- MCP: exposed as the `token_sample` tool.

**Examples**

```bash
pragma token sample
```

## upgrade

### pragma upgrade

Upgrade the pragma CLI to the latest version.

Checks the registry for the active channel's latest release and runs your package manager's global-update command. Preview the update before applying it.

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
