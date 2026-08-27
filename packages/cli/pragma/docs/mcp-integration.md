# MCP integration

pragma is a Model Context Protocol (MCP) server as well as a CLI. The same capability grammar that produces the CLI commands produces the MCP tools, so an agent and a human read the same design-system knowledge graph through one surface.

## Register with a harness

The quickest path is the installer, which detects your AI harnesses and registers the pragma server for each:

```bash
pragma setup mcp
```

Preview what it would write first with `pragma setup mcp --dry-run`.

## Run the server manually

The server speaks JSON-RPC over stdio through the `pragma mcp serve` command. A harness launches it by running the `pragma` command with the `mcp serve` arguments — a typical stdio-server configuration:

```json
{
  "command": "pragma",
  "args": ["mcp", "serve"]
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

  A read returns the entity's **graph neighbourhood** as a Turtle document (`text/turtle`) — not just its own triples, and not JSON. The `@prefix` header is declared once, then:

  - the subject's own triples, with long literals previewed (`"""…"""`) and a `#` comment stating the full length;
  - its blank-node objects inlined one level as Turtle `[ … ]` records, since a blank node's label is store-local and cannot be read back through the template;
  - a `# ── referenced by ──` section carrying the edges that point **at** the subject, written as ordinary triples in the other direction.

  IRI-versus-literal is carried by Turtle syntax itself (`ds:Foo` against `"Foo"`), and datatypes, language tags and RDF 1.2 base directions are native.

  Bounds ride as `#` comments rather than data. An inbound group is either a **relation** — narrow fan-in, every subject part of the answer, so listed — or a **roster**, which grows with the data rather than the model and is **sampled**:

  ```turtle
  # ds:implementsBlock — 1
  ds:implementation.react-ds-global.global.component.button ds:implementsBlock ds:global.component.button .
  # rdf:type — 110 total, sample of 3; use the noun's list verb for the full set
  ds:apps.component.file_tree rdf:type ds:Component .
  ```

  The stated count is always the true total. The two kinds are told apart by fan-in, not by predicate name, so no vocabulary is hardcoded.

  A resource read carries no parameters of its own, so it resolves its level from config — `config_set detail detailed` is how an agent asks a resource for more, while `graph inspect` takes `--detail` and the `graph_inspect` tool a `detail` argument. `graph inspect --format json` still returns the structured projection if you need to parse rather than read it.

- **Prompts** — the workflow prompt templates the active pack's graph declares are offered natively over `prompts/list` and `prompts/get`, and as the `prompt_list` / `prompt_lookup` content tools. The two views project the same entities, addressed by the prompt terms the distribution declares. This distribution's graph carries none today, so both views are empty.
- **Instructions** — the handshake orientation described above.

## The server's identity

Two different things introduce the server to its machine peers, and they deliberately move differently:

- **`serverInfo` projects from the distribution.** On `initialize` the server names itself with the distribution's declared `name` (the same projection that names the CLI binary) and the package version. A fork's MCP server therefore introduces itself under the fork's own name with no code change. Do not hard-code `pragma` as the expected server name in a client — read `serverInfo`. The rule is recorded in the surface covenant (`surface/surface.v2.json`, `mcpSurface.serverInfo`) and pinned from a fork's config by the identity suite.
- **The resource scheme and `_meta` keys are frozen.** The `pragma:{+uri}` resource template, the `pragma:<uri>` URIs it mints, and the `pragma/box` / `pragma/instanceCount` `_meta` taxonomy keys are protocol identity, not branding: clients persist resource URIs, and deriving the scheme from the distribution's name was measured to make every one of a fork's advertised resources unreadable (the template renamed while the minted URIs stayed literal). Every distribution serves them unchanged. Revisit only if a real fork needs wire-level distinction — and then move the template and both minting sites together.

## Plan-first mutations

Every mutating tool is **plan-first**. Called without `confirm: true`, it returns the plan it *would* apply (`{ planOnly: true, confirmRequired: true }`) instead of acting. Called with `confirm: true`, it executes. A mutating tool also accepts an optional `cwd` — an absolute project directory to write into — which defaults to the server's working directory and is validated as the single write root the security jail and the effect interpreter share.

This mirrors the CLI's `--dry-run` / `--yes` contract: an agent previews, then confirms. See the [tool reference](./reference/tools.md) for the per-tool input schema and the [errors reference](./reference/errors.md) for the response envelope.
