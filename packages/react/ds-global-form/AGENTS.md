# Preface

`@canonical/react-ds-global-form` is the React form package: presentational inputs, fields bound to react-hook-form, and the `Field` and `Form` patterns built on them. Read this before adding or changing an input, a field or a story in this package; the tier layout and the field machinery are not obvious from any one file.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

The package is a library built with `tsc` and published to npm. Its source is organised by ontology tier: presentational inputs with no react-hook-form, fields that bind one input each to react-hook-form, and the `Field` switch and `Form` wrapper that consumers use. Shared field machinery and utilities sit beside the tiers. Most of the tiers stay internal; consumers reach an input through `<Field inputType="…">`. How the tiers depend on each other, how a field is composed and the field conventions are in `.kb/architecture.md`; how stories are written is in `.kb/storybook.md`.

# Important

- Import package modules with relative paths ending in `.js`; the package is built with `tsc`, so the root `.kb/module-imports.md` applies.
- Every stylesheet in the package is wrapped in `@layer ds.components.global`; a new stylesheet is wrapped the same way (`README.md`, "Every stylesheet is in `ds.components.global`").
# Directory

- `src/lib/` - The library: the tier folders `subcomponent/`, `component/` and `pattern/`, the field machinery in `common/`, and `utils/`.
- `src/lib/_work_in_progress/` - Spikes that are not part of the library, such as the density testbed.
- `src/index.ts` - The package entry; it re-exports `src/lib/index.ts`, which chooses the public surface.
- `src/index.css` - The package stylesheet: the `--form-*` tokens, the `.ds.form` and field grid, and the shared `.ds.input.chrome` rules.
- `src/density.css` - Applies the density primitives from `@canonical/styles` to the form controls.
- `src/docs/` - Storybook documentation pages (MDX) and their example stories.
- `src/storybook/` - Story decorators and fixtures, imported by stories only.
- `src/testing/` - Test helpers, such as `renderWithForm`.
- `.storybook/` - Storybook configuration, built on `@canonical/storybook-config`.

# Documents

- `.kb/architecture.md` - The tiers and their dependencies, the public surface, how every field is composed from `bindField` and a wrapper, required and optional marking, and how error state and input chrome are styled.
- `.kb/storybook.md` - Story titles and decorators per tier, the `form()` and `surfaces()` helpers, and how an error story is set up.
