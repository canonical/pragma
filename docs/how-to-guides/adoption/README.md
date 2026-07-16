# Pragma adoption for 26.10

This directory contains the track guides for the 26.10 pragma adoption program. The program is organised in two independent families:

- **Family A — consume pragma in your application.** Three ordered tracks: [A1 (styles, tokens, assets)](./TRACK_A1_STYLES_TOKENS_ASSETS.md) → [A2 (base components)](./TRACK_A2_BASE_COMPONENTS.md) → [A3 (form components)](./TRACK_A3_FORM_COMPONENTS.md). A1 is a prerequisite for A2 and A3.
- **Family B — document your components** in the design-system documentation database. *Guide in preparation.*

Expected effort per team: about one week of engineering time and half a week of design time across all four tracks.

Every guide follows the same structure — *who this is for*, *what "done" means*, *the path*, *verify*, *if you get stuck*, *next* — so you always know where to look.

## Requirements

- **React ≥ 19.2.4.** The pragma React packages currently declare `react: ^19.2.4` as a direct dependency; on older React 19 minors your package manager installs a second React copy, which breaks hooks. Once React moves to `peerDependencies` this requirement relaxes to "React 19".
- **A bundler that resolves package specifiers in CSS `@import`s** (Vite does this out of the box).

## Suggested tooling

None of these are required for adoption, but they make it faster. Commands are shown with `bun`; substitute `npm install` for `bun add` losslessly.

| Tool | Install | What it gives you |
|---|---|---|
| [`@canonical/typescript-config`](https://www.npmjs.com/package/@canonical/typescript-config) | `bun add -D @canonical/typescript-config` | The reference tsconfig for pragma projects — one less thing to maintain, easier upstreaming. |
| [`@canonical/summon`](https://www.npmjs.com/package/@canonical/summon) + generators | `bun add -g @canonical/summon @canonical/summon-component @canonical/summon-application` | Scaffolding: `summon component react src/lib/MyComponent` for components (see [Create a React component](../CREATE_A_REACT_COMPONENT.md)), `summon application react my-app` for a reference app to learn the conventions from. |
| [`@canonical/pragma-cli`](https://www.npmjs.com/package/@canonical/pragma-cli) | `bun add -g @canonical/pragma-cli`, then `pragma setup all` | The pragma CLI and MCP server: project setup (shell completions, token LSP, MCP wiring for your AI tooling), the design-system knowledge graph, and the code standards (`pragma standard list`). **Currently Linux x64 only.** |
| Terrazzo token LSP | `pragma setup lsp`, or directly `bunx @canonical/terrazzo-lsp-extension` | VS Code autocompletion and documentation for pragma design tokens. The direct `bunx` form works on any OS. |
| [web-code-standards](https://github.com/canonical/web-code-standards) | `pragma standard list`, or browse the repo | The code standards pragma follows — structured data your AI tooling can consume directly. |

## Discover the components

Both component libraries are browsable directly in their live Storybooks (latest Chromatic build):

- [ds-react-global.canonical.com](https://ds-react-global.canonical.com/) — global components ([Track A2](./TRACK_A2_BASE_COMPONENTS.md))
- [ds-react-global-form.canonical.com](https://ds-react-global-form.canonical.com/) — form components ([Track A3](./TRACK_A3_FORM_COMPONENTS.md))

## Design counterpart

Designers adopt pragma by consuming the *Pragma — Core component library* in Figma instead of the Vanilla library. Where a pragma component exists, use it rather than its Vanilla counterpart, and watch for renamed or split components.

## Registering progress

Details on how teams report adoption progress are communicated separately by the program.
