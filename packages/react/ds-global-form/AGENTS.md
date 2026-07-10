# Preface

`@canonical/react-ds-global-form` is the React form package: presentational inputs,
react-hook-form-bound fields, and a polymorphic `Field`/`Form` pattern. Read this
before adding or changing a form input, field, or story here — the tier layout and
composition machinery are non-obvious. Skip it for work outside this package.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

The package is organised in ontology tiers under `src/lib/`: `subcomponent/`
(presentational inputs, no react-hook-form), `component/` (the RHF-bound `*Field`
wrappers), and `pattern/` (the public `Field` switch + `Form`). Two non-tier folders
support them: `common/` (the `bindField` + `Wrapper` machinery every field is built
from) and `utils/` (hooks, middleware, phone-country data). The public surface is
deliberately small — only `pattern/*` and `utils/middleware/*` are exported. See
`.kb/architecture.md` for the tiers, the composition pattern, and the field
conventions; `.kb/storybook.md` for the story decorators and helpers.

# Directory

- `src/lib/` - The tiered library (see `.kb/architecture.md`).
- `src/storybook/` - Storybook decorators and the `errorStory` factory (see `.kb/storybook.md`).
- `src/testing/` - Test helpers (`renderWithForm`).
- `src/index.css` - Package token catalog + the shared `.ds.input.chrome` / `.ds.field` rules.
- `.storybook/` - Storybook config (uses `@canonical/storybook-config`).

# Documents

- `.kb/architecture.md` - Tier structure, dependency direction, the `bindField` + `withWrapper` composition, the required/optional and error-state field conventions, and the `#lib/*` import alias.
- `.kb/storybook.md` - The `form` / `grid` / `danger` decorators, the `errorStory()` factory, and the per-tier story conventions (bare subcomponents; `form()`-wrapped fields; `WithError` vs `ErrorState`).
