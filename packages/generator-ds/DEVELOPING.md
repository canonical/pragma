### Developing and trying the generator locally

Follow these steps from the `packages/generator-ds` directory to build and try the generator during development.

Build the generator:

```bash
bun install
bun run build
```

List available generators:

```bash
ls src
```

Try it in a fresh test project:

```bash
mkdir test-project
cd test-project
bunx yo @canonical/ds:component Button --withStyles
```

Notes:

- The command above will run the `component` sub-generator to scaffold a `Button` component with styles.
- Re-run `bun run build` after making changes to the generator source to pick up updates.
