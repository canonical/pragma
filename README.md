## Documentation

Following the [diataxis](https://diataxis.fr/) principles, the monorepo documentation is split into four categories.
- Tutorials : 
- Explanations : 
- How-to guides : 
- Information Reference : 

### Tutorials

Tutorials have not been added to the documentation yet.

### Explanations :

| Resource | Description |
|----------|-------------|

### How-to guides :

| Resource | Description |
|----------|-------------|

### Information Reference : 


| Resource | Description |
|----------|-------------|


## Webarchitect

The monorepo uses `@canonical/webarchitect` to validate package architecture compliance.

### Ruleset Hierarchy

```
base (minimal base for future extensibility)
  └── package (biome config + package.json structure for compiled packages)
  │     ├── tool (GPL-3.0 license) - for CLI tools and applications
  │     └── library (LGPL-3.0 license) - for reusable libraries
  │
  └── tool-ts (GPL-3.0 license) - for TypeScript-only tools (no build, runs directly with Bun)
```

| Ruleset | License | Use Case |
|---------|---------|----------|
| `library` | LGPL-3.0 | Reusable packages consumed by other projects |
| `tool` | GPL-3.0 | CLI tools, build tools, internal utilities (compiled) |
| `tool-ts` | GPL-3.0 | TypeScript-only tools that run directly with Bun (no build step) |

### Packages Pending Integration

The following packages still need webarchitect integration:

- `@canonical/typography` - Non-standard structure (CSS + CLI)
- `@canonical/generator-ds` - Non-standard structure (generators/ instead of dist/)
- `@canonical/storybook-addon-msw` - Missing `module` field
- `@canonical/storybook-addon-baseline-grid` - Missing `module` field
- `@canonical/svelte-ssr-test` - Pending
- All `@canonical/styles-*` packages - CSS-only, need dedicated `styles` ruleset

## Caveats
- For the time being, node 23 seems to provoke [an error](https://github.com/canonical/ds25/issues/226). Use node v22 for the time being, for instance with `nvm use 22`.
- We currently require Bun v1.2.19. Please run `curl -fsSL https://bun.com/install | bash -s "bun-v1.2.19"` to install 1.2.19.
  - On Windows: `iex "& {$(irm https://bun.com/install.ps1)} -Version 1.2.19"`

## Thanks
Thanks to [Chromatic](https://www.chromatic.com/) for providing the visual testing platform that helps us review UI changes and catch visual regressions.
