# @canonical/cli-ui

The shared React [Ink](https://github.com/vadimdemedes/ink) UI for Canonical
CLIs. The interactive generator experience — the prompt sequence, the file
preview and "Proceed?" confirmation, and the live execution progress — lives
here once and is rendered by both the `summon` binary and `pragma
create`/`setup`, so the two CLIs look and behave identically without duplicating
any components.

## Usage

```ts
import { renderApp } from "@canonical/cli-ui";

// Mounts the Ink App (prompts → preview/confirm → execution) and resolves when
// the user finishes. `generator` is a summon GeneratorDefinition.
await renderApp({ generator, preview: true, stamp });
```

The individual components (`App`, `PromptSequence`, `FileTreePreview`,
`ExecutionProgress`, `Spinner`) are also exported for composition.

## Anatomy documentation

Every component has an anatomy-DSL Turtle sidecar under `src/anatomy/<Name>.ttl`,
mirroring how design-system components are documented: a `ds:Component` whose
`ds:anatomyDsl` property holds a YAML node tree describing the component's
rendered structure — each `<Box>`/`<Text>`/child mapped to a node with a role,
the Ink props it sets mapped to the anatomy styles vocabulary, and cardinality
derived from the render logic (`x && …` → `0..1`, `.map(…)` → `0..n`). The tree
is documentation of structure, not a runtime input.

## Interactive-only

The UI takes over the terminal via Ink, so it only runs on a real TTY. A CLI
should route to `renderApp` when interactive and to a UI-free path (batch,
machine output, dry-run) otherwise — see `pragma`'s `renderGeneratorUi`. This
also means the rendered UI cannot be asserted headlessly; test the routing
decision and the anatomy sidecars, and confirm the visual flow in a real
terminal.
