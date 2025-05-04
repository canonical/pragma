## Svelte Component Generator

This generator creates a new Svelte component with a basic structure.

### Getting Started
1. Install [Yeoman](https://yeoman.io/): `npm i -g yo @canonical/generator-ds`
2. Run the generator: `yo @canonical/ds:sv-component path/to/ComponentInPascalCase`
3. The required arguments and possible flags are listed by invoking the generator with the `--help` flag, for instance `yo @canonical/ds:sv-component --help`

### Options
- `--withStyles` or `-c`: Creates a `styles.css` file associated with the component
- `--useClsx` or `-x`: Uses the clsx library for class name handling instead of simple string join
