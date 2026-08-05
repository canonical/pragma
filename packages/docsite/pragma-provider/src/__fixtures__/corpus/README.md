# The hermetic corpus

A hand-written Turtle corpus laid out in the exact shape `collectTtlSources`
walks, so every property of the collector and the boot is falsifiable **without
a populated refs cache**.

This is what makes the package testable at all. Pragma's real corpus is the
pragma CLI's refs cache (`~/.cache/pragma/refs/@canonical`, three packages,
~400 `.ttl`) plus a semantics working tree. Neither is obtainable in CI or in a
fresh clone, so a suite that needed them would either not exist or be skipped —
and a skipped gate is worse than no gate. Precedent in-repo:
`packages/runtime/ke-graphql/demo/graph.ttl` is exactly this, and that package
holds 551 tests at 100%.

## What each file is for

| Path | Property it makes falsifiable |
|---|---|
| `refs/@canonical/design-system/main/definitions/ontology.ttl` | the first root compiles; `ds:Entity` roots the class tree the shim would smear across |
| `refs/@canonical/design-system/main/data/instances.ttl` | instance data merges into the same store; carries a **channel-dotted reference** (`ds:.subcomponent.button-label`) that only parses because `escapeChannelDottedRefs` rewrites it |
| `refs/@canonical/design-system/main/data/.channel.ttl` | **dot-prefixed files are skipped.** Its one triple would add a `ds:Component` named `leaked`; nothing in the collected set ever mentions it |
| `refs/@canonical/anatomy-dsl/main/definitions/anatomy.ttl` | declares `<http://anatomy-dsl.example.org/ontology#uri>` **verbatim** — the IRI `ANATOMY_URI` names. This is the M005 collision, reproduced |
| `sem/surface/definitions/surface.ttl` | the **second root** merges: `sem://surface#Job` yields a `Job` type the first root cannot |
| `sem/design-system-docs/data/shim-concept.ttl` | the real `EXCLUDED_SOURCES` entry, at its real path. `ds:embodiesConcept rdfs:domain ds:Entity` is the domain smear; the collector must drop this file |

`code-standards` is listed in `REF_PACKAGES` but **deliberately absent from the
corpus**: that is what exercises `walkTtl`'s "directory does not exist" return,
which is the state a partially-populated refs cache is actually in.

## What this corpus is not

It is **not** a copy of pragma's ontologies. The IRIs are `example.org` stand-ins
except for `anatomy:uri`, which must be byte-identical to the real IRI because
the constant under test names it. Vendoring the real ontologies into this repo
would be a licensing and staleness problem for no test value: the properties
under test are about the collector and the compiler, not about pragma's
modelling.
