# @canonical/pragma-cli

`pragma` answers questions about Canonical's design system from your terminal — and, run as a Model Context Protocol (MCP) server, from your AI agent. The design system ships as a knowledge graph: every block (a component, pattern, or layout), every tier, modifier family, and code standard is a node `pragma` can read. Reads answer offline, from a snapshot compiled into the package — no network, no build.

| You want to… | Run |
|---|---|
| See every block in the design system | `pragma block list` — all 251, each with its tier |
| Read a block's full spec — anatomy, modifiers, properties | `pragma block lookup Button` |
| Find the design system's name for something you already know | `pragma block lookup 'Nav*'` — lookups take names or globs |
| Know which tier something belongs to | `pragma tier list`, `pragma tier lookup <name>` |
| Stay consistent with the modifiers that already exist | `pragma modifier list` — 11 families |
| Check your code against the coding standards | `pragma standard list --category react` |
| Scaffold a component, package, or application | `pragma create component react <path>` |
| Ask the graph something the commands don't cover | `pragma graph query "<sparql>"` |
| Set it up, and check it's healthy | `pragma setup`, then `pragma doctor` |
| Give your AI agent the same access | `pragma setup mcp` |

The sections below take these in turn.

## From install to first answer

```bash
bun add --global @canonical/pragma-cli
# or: npm install -g @canonical/pragma-cli
```

The package ships compiled JavaScript and runs on **Node.js 22.18+ or 23.6+** (any 24 or later), on any platform Node supports. pragma reads its own `pragma.conf.ts` — and your project's `pragma.config.ts` — through Node's TypeScript type stripping, which is on by default from those versions. Node 23.0–23.5 are excluded deliberately: they satisfy a plain `>=22.18` but predate the 23.x line's own default-on release.

Then ask for a component:

````console
$ pragma block lookup Button
## Button

- Tier: ds:apps_launchpad

### Summary
The **Button** component is an interactive element that allows users to trigger an action.

**Main Use Cases:**

- **Actions:** Trigger an action, such as submitting a form or opening a dialog.
- **Navigation:** Navigate to a different page or view.

### Guidelines
### Accessibility

- **Label:** Always provide a clear and descriptive label for the button.
- **Focus state:** Provide a clear focus state for the button.

⋮

### Anatomy (DSL)
```yaml
---
node:
  uri: app-launchpad.component.button
  styles:
    layout.type: stack
    layout.direction: horizontal
    layout.align: center
    spacing.internal: spacing/inline/small
    appearance.background: color/background/neutral/default
    appearance.border: border/style/solid
    appearance.radius: radius/medium
    typography.size: typography/paragraph/default
  edges:
⋮
```

### Properties
- name: label | type: text | optional: false
- name: variant | type: choice | optional: true
- name: disabled | type: boolean | optional: true
- name: loading | type: boolean | optional: true
````

Abridged — the two cuts are marked `⋮`. The full answer is 83 lines: content-writing guidelines, the rest of the anatomy tree (child nodes with slot names and cardinalities, down to their token bindings), and a link to the classic anatomy reference.

That answer came from the snapshot inside the package. No network, no cache, no project setup — `lookup` and `list` work from the moment the install finishes.

## What the graph knows

What this distribution's graph answers today:

| Ask | Answer |
|---|---|
| `pragma block list` | **251** blocks — components, patterns, layouts, and subcomponents, each with its tier |
| `pragma tier list` | **15** tiers — `global`, `apps` plus nine app tiers, `sites` plus one, `stores`, `documentation` |
| `pragma modifier list` | **11** modifier families — Importance (Primary/Secondary/Tertiary), Anticipation (Caution/Constructive/Destructive), Criticality, Density, Lifecycle, Mode, Release, Surface, and three more |
| `pragma standard categories` | **21** code-standard categories — react 16, css 15, lit 13, svelte 12, rust 11, storybook 11, code 10, … |
| `pragma token list` | **0** — this distribution's graph ships no token entities |
| `pragma prompt list` | **0** — likewise, no prompt entities |

The two zeroes are real answers: the commands say the store is empty rather than inventing, and stay empty until a pack that ships those entities is configured.

```bash
pragma block list
pragma tier list
pragma modifier list
pragma standard categories
pragma token list
pragma prompt list
```

The commands are views over one RDF graph. Anything they don't cover, ask directly — prefixes like `ds:` are bound automatically from the active pack:

```bash
pragma graph query "SELECT ?s WHERE { ?s a ds:Component }"
```

## Find the spec, build from it, check the result

**Find the spec.** Lookups take a name or a glob — useful when you know roughly what something is called:

```bash
pragma block lookup 'Nav*'
pragma tier lookup Global
```

**Build from it.** The `create` commands scaffold a component, package, or application. They run the `@canonical/summon-*` generator packages directly — those are regular dependencies of this package, so scaffolding works from a clean install. Preview any of them with `--dry-run`:

```bash
pragma create component react src/components/Button
```

**Check the result.** List the standards for your stack, then look one up by name for its do/don't code examples:

```bash
pragma standard list --category react
```

## Your agent reads the same graph

```bash
pragma setup mcp
```

This registers pragma as an MCP server (over stdio) with the AI coding tools it detects; `pragma mcp` is the manual entry point. The server projects the same reads and scaffolds as MCP tools, plus a `pragma:{+uri}` resource surface for entity reads. Its handshake tells agents to start with the `capabilities` tool and discover from there, and every mutating tool is plan-first: it returns the plan it would apply, and applies nothing until called again with `confirm: true`.

See [docs/mcp-integration.md](./docs/mcp-integration.md) for the full surface.

## Setup and health

```bash
pragma setup
pragma doctor
```

`pragma setup` is one wizard for the whole environment: MCP registration, shell completions, agent skills, and the LSP extension. Each installer can target your project's configuration, your user-level (global) configuration, or both — `--scope project|global|both`, with `--global`/`--local` as shorthands. Preview everything it would write with `pragma setup --dry-run`, or run one installer directly: `pragma setup mcp`, `setup completions`, `setup skills`, `setup lsp`.

The LSP step installs the Terrazzo extension, and the extension's own log is the fastest way to confirm it took. Open your editor's Output panel, select the `terrazzo-lsp` channel, and look for a startup block like this (timestamps dropped, paths shortened):

```console
[info] Config loaded from <project>/packages/react/ds-global/terrazzo-lsp.config.json
[info] Root: <project>/packages/react/ds-global
[info] Artifacts: <project>/packages/react/ds-global/node_modules/@canonical/design-tokens/dist/tokens.json
[info] Loaded 781 tokens from 1 artifact
[info] Global stylesheets: 1 file, 0 declarations
[info] terrazzo-lsp ready
```

The token count is the line to read: `terrazzo-lsp ready` says the server started, but a run that loaded 0 tokens resolved its artifact path to nothing and will complete nothing. With tokens loaded, type `color: var(--` in a stylesheet — the design tokens should appear as completions.

`pragma doctor` checks the environment (Node version, store health, registrations) and says what to fix. `pragma info` shows the version, the configuration in effect, and update status; `pragma upgrade` updates the CLI itself.

## Point it at your own design system

Your project's `pragma.config.ts` names the packs — design-system data packages — the graph is built from:

```bash
pragma sources update
pragma sources status
```

`sources update` resolves the configured packs and rebuilds the local store; `sources status` reports which store is answering — the shipped snapshot or your build — and exactly what it was built from. Every `list`, `lookup`, and `sample` command then answers from your graph.

The read surface itself is also data, not code. The distribution's own `pragma.conf.ts`, shipped inside the package, declares every read noun — `block`, `standard`, `tier`, their queries, columns, and detail levels — as configuration. A fork serving a different design system rewrites that one file and gets its own CLI commands and MCP tools without writing any command code. (Two files, deliberately distinct: `pragma.config.ts` is your project's; `pragma.conf.ts` is the distribution's.)

[docs/config-model.md](./docs/config-model.md) explains the configuration layers; [docs/architecture.md](./docs/architecture.md) explains how one set of declarations is projected as both CLI commands and MCP tools.

## Reference

The [command & tool reference](./docs/reference/index.md) is generated from the same declarations the CLI runs, so it cannot drift from the code.

- [Getting started](./docs/getting-started.md)
- [The design system graph](./docs/design-system.md)
- [Setup and health](./docs/setup.md)
- [MCP integration](./docs/mcp-integration.md)
- [Configuration model](./docs/config-model.md)
- [Architecture](./docs/architecture.md)
- [Skills](./docs/skills.md)
- [Changelog](./CHANGELOG.md)

License: GPL-3.0
