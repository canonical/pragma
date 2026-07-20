# MCP integration

pragma is a Model Context Protocol (MCP) server as well as a CLI. The same capability grammar that produces the CLI commands produces the MCP tools, so an agent and a human read the same design-system knowledge graph through one surface.

## Register with a harness

The quickest path is the installer, which detects your AI harnesses and registers the pragma server for each:

```bash
pragma setup mcp
```

Preview what it would write first with `pragma setup mcp --dry-run`.

## Run the server manually

The server speaks JSON-RPC over stdio through the `pragma mcp` entry point. A harness launches it by running the `pragma` binary with the `mcp` argument — a typical stdio-server configuration:

```json
{
  "command": "pragma",
  "args": ["mcp"]
}
```

The process reads requests on stdin and writes responses on stdout; diagnostics go to stderr so they never corrupt the protocol stream.

## The handshake

On `initialize`, the server sends an `instructions` string **once** — not per tool call — so an agent arrives oriented. It carries:

- what pragma is (a CLI and MCP server over a design-system knowledge graph),
- the conventions (the knowledge-graph model, the tier/channel scoping, the SPARQL escape hatch),
- and a short discovery sequence naming the first tools to call.

Live numbers (entity totals, the active tier) are deliberately left out of the handshake so it needs no store boot; an agent fetches those with the `info`, `config_show`, and `sources_status` tools.

## Discover the tools

The server advertises a catalog of read and scaffold tools. Rather than hard-code them, call the discovery tool first:

```bash
pragma capabilities
```

`capabilities` returns the conventions, a four-stage discovery sequence, and every live tool annotated with a behavioural `use_when` hint and a category — all derived from the live grammar, so the catalog never drifts from the code. The [tool reference](./reference/tools.md) lists every tool and its input schema.

## Non-tool surface

Beyond tools, the server exposes three surfaces:

- **Resources** — a `pragma:{+uri}` resource template. An agent reads one entity by URI; listing and autocomplete are storeless over the pack index, and a read shares the CLI's entity reader. `graph_inspect` is the tool equivalent when you already hold a URI.
- **Prompts** — the design system's workflow templates are offered natively over `prompts/list` and `prompts/get`, and as the `prompt_list` / `prompt_lookup` content tools. The two views project the same `ds:Prompt` entities.
- **Instructions** — the handshake orientation described above.

## Plan-first mutations

Every mutating tool is **plan-first**. Called without `confirm: true`, it returns the plan it *would* apply (`{ planOnly: true, confirmRequired: true }`) instead of acting. Called with `confirm: true`, it executes. A mutating tool also accepts an optional `cwd` — an absolute project directory to write into — which defaults to the server's working directory and is validated as the single write root the security jail and the effect interpreter share.

This mirrors the CLI's `--dry-run` / `--yes` contract: an agent previews, then confirms. See the [tool reference](./reference/tools.md) for the per-tool input schema and the [errors reference](./reference/errors.md) for the response envelope.
