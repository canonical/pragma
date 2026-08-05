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

- what pragma is — `pragma — <the distribution's one-line help> (a CLI and MCP server over a knowledge graph).`, projected from the distribution config rather than written out,
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
- **Prompts** — the workflow prompt templates the active pack's graph declares are offered natively over `prompts/list` and `prompts/get`, and as the `prompt_list` / `prompt_lookup` content tools. The two views project the same entities, addressed by the prompt terms the distribution declares. This distribution's graph carries none today, so both views are empty.
- **Instructions** — the handshake orientation described above.

### The wire identity is deliberately frozen

Almost everything a user or an agent reads from this CLI derives from one file, `pragma.conf.ts` — the binary's name, its help, its colophon, every recovery hint, every generated page. The MCP **wire identity** is the documented exception, and it is deliberate, not an oversight:

- the resource scheme `pragma:` in the `pragma:{+uri}` template,
- the `pragma/box` and `pragma/instanceCount` `_meta` keys a listed resource carries.

These are **protocol identity, not copy**. A client that has stored a resource URI has stored an *address*, and a client that reads `_meta` reads it by an agreed key. Two distributions built from this kernel are therefore indistinguishable on the wire — which is the price of making a stored URI keep working, and it is the price we chose to pay.

It is not a price paid out of caution. Deriving the scheme per distribution has been attempted here and it failed in the worst available way: the URI *template* was derived while the two sites that MINT URIs stayed literal, so a fork advertised `recipes:{+uri}` over a list of 653 `pragma:` URIs. Every resource the server offered was unreadable, and the readable form was never advertised.

The freeze is enforced, not merely asserted, and it takes **two** guards because one cannot see the whole of it. `surface/surface.v2.json` records the freeze in its `$comment`; `capabilities/resources/resources.test.ts` derives ONE scheme token from that covenant and holds all four writings to it — the covenant entry, the provider's declared template, every URI the listing mints (the recovery entry included), and both `_meta` key namespaces. That catches the mutation that was actually made: one writing changed, three left behind.

It cannot catch the mutation the freeze exists to prevent. This distribution is *called* `pragma`, so under its own identity a derived `${BIN_NAME}:{+uri}` is byte-identical to the frozen literal and every one of those four checks still passes. So `src/identity.test.ts` runs the same four checks under a fork's name, where a derivation emits `recipes:{+uri}` and the covenant still says `pragma:{+uri}`. The two together are the freeze: one holds the writings to each other, the other holds them to the covenant across a rename.

## Plan-first mutations

Every mutating tool is **plan-first**. Called without `confirm: true`, it returns the plan it *would* apply (`{ planOnly: true, confirmRequired: true }`) instead of acting. Called with `confirm: true`, it executes. A mutating tool also accepts an optional `cwd` — an absolute project directory to write into — which defaults to the server's working directory and is validated as the single write root the security jail and the effect interpreter share.

This mirrors the CLI's `--dry-run` / `--yes` contract: an agent previews, then confirms. Both surfaces use the same plan interpreter, which performs the mutation's READS for real and simulates only its destructive effects — so a preview reports the branch the confirmed run will take, and a call whose real run would fail on a read fails at preview instead of returning a plan that cannot happen. `Exec` is still simulated (empty output, exit 0), so a plan cannot report what a command would print. See the [tool reference](./reference/tools.md) for the per-tool input schema and the [errors reference](./reference/errors.md) for the response envelope.
