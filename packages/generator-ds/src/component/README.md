## React Component Generator

This generator creates a new React component with a basic structure.

### Getting Started
1. Install [Yeoman](https://yeoman.io/): `npm i -g yo @canonical/generator-ds`
2. Run the generator: `yo @canonical/ds:component path/to/ComponentInPascalCase`
3. The required arguments and possible flags are listed by invoking the generator with the `--help` flag, for instance `yo @canonical/ds:component --help`

### Options
- `--withStyles` or `-c`: Creates a `styles.css` file associated with the component
- `--withStories` or `-s`: Creates a Storybook file for the component
- `--withoutSsrTests` or `-w`: Skips the creation of SSR tests for the component
