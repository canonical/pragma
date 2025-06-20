## Svelte Component Generator

This generator creates a new Svelte component with a basic structure.

### Getting Started
1. Install [Yeoman](https://yeoman.io/): `npm i -g yo @canonical/generator-ds`
2. Run the generator: `yo @canonical/ds:sv-component path/to/ComponentInPascalCase`
3. The required arguments and possible flags are listed by invoking the generator with the `--help` flag, for instance `yo @canonical/ds:sv-component --help`

### Options
- `--withStyles` or `-c`: Creates a `styles.css` file associated with the component
- `--withStories` or `-s`: Creates a Storybook file for the component
- `--useTsStories` or `-t`: Uses the `.ts` based story formats instead of the CSF3 & `.svelte` format. Useful when there is a specific need for a template-based stories or function-based stories, otherwise not recommended. Has no effect if `withStories` is not set.
