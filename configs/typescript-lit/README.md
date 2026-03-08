# Canonical Web Components TypeScript Configuration

This package provides a central TypeScript configuration for Canonical's Web Components projects using [Lit](https://lit.dev/).

It extends the [base configuration](https://www.npmjs.com/package/@canonical/typescript-config) and adds the settings required for Lit's decorator-based component authoring.

## Getting Started

1. Install TypeScript: `bun add -d typescript`
2. Install this configuration: `bun add -d @canonical/typescript-config-lit`
3. Create a `tsconfig.json` in the root of your project and extend it:

```json
{
  "extends": "@canonical/typescript-config-lit"
}
```

## Configuration

This configuration enables the following behaviour on top of the base config:

1. [`DOM` library](https://www.typescriptlang.org/tsconfig/#lib): Adds the `DOM` library so browser and custom-element APIs are available.
2. [`experimentalDecorators`](https://www.typescriptlang.org/tsconfig/#experimentalDecorators): Enables TypeScript's legacy decorator syntax, required by Lit's `@customElement`, `@property`, and related decorators.
3. [`useDefineForClassFields: false`](https://www.typescriptlang.org/tsconfig/#useDefineForClassFields): Disables the ECMAScript-standard class field semantics that would break Lit's reactive property system. When set to `true` (the default for modern targets), class fields are defined with `Object.defineProperty`, which prevents Lit's property accessors from being installed correctly.
