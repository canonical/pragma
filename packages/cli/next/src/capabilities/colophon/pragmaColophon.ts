/**
 * The built-in pragma colophon — how the toolchain itself is made. Authored
 * Markdown grounded in this tree's real architecture; surfaced by `pragma
 * colophon` as the first section, before any active pack's domain colophon.
 *
 * `PRAGMA_COLOPHON` is the full narrative for humans; `PRAGMA_COLOPHON_SUMMARY`
 * is the condensed form `--format llm` emits (Markdown IS the agent-optimal shape).
 * Both are BODIES with no leading H1 — the renderer supplies the "pragma"
 * heading, so the section is never double-titled.
 */

/** The full built-in colophon (Markdown body). */
export const PRAGMA_COLOPHON = `pragma is a **domain-based toolchain**: one CLI and one MCP server projected
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
different domain — including the domain colophon printed below this one.`;

/** The condensed colophon for `--format llm` (Markdown body, no leading H1). */
export const PRAGMA_COLOPHON_SUMMARY = `pragma is a domain-based toolchain: one CLI + MCP server projected from a single \`VerbSpec\` grammar.

- **Effect monad** (\`@canonical/task\`): reads are async; a mutation returns an interpreted \`Task\`, so \`--dry-run\` and \`--undo\` are free. The dispatcher branches on \`capability.mutates\`.
- **One grammar, many projections**: CLI, MCP tools, completion, and docs all project one \`VerbSpec\`; the emitted surface is frozen in a covenant so the projections never drift.
- **LLM-optimized output**: every verb renders \`plain\` / \`json\` / \`llm\`; \`--format llm\` (or a piped stdout) emits condensed Markdown for agents.
- **Modular + storeless**: capability modules; the triple store boots only for \`needsStore\` verbs.
- **Domain as data**: a pack is a declarative \`PackDefinition\` compiled to verbs over a content-addressed graph built by \`sources update\`.`;
