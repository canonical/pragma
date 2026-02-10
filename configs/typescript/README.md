# Canonical Typescript Configuration

This package provides a central configuration for Canonical's TypeScript projects.

For React projects, see the [React configuration](https://www.npmjs.com/package/@canonical/typescript-config-react).

## Getting Started
1. Install Typescript: `bun add -d typescript`
2. Install this configuration: `bun add -d @canonical/typescript-config`
3. Create a `tsconfig.json` file in the root of your project and extend this configuration.

```json
{
  "extends": "@canonical/typescript-config"
}
```

## Configuration

This configuration enables the following behavior:
1. [`ES2023` library](https://www.typescriptlang.org/tsconfig/#lib) inclusion: Includes the `ES2023` library for TypeScript projects.
2. [`NodeNext` module](https://www.typescriptlang.org/tsconfig/#module): enables module resolution for Node projects with both CJS & ESM support.
   1. Explicit import file extensions (e.g., `./Button/index.js` instead of `./Button`).
3. `ES2023` target: Targets the `ES2023` ECMAScript version. Emits modern JavaScript syntax, omits legacy transforms and polyfills. 
4. [Strict mode](https://www.typescriptlang.org/tsconfig/#strict): Enables strict type checking & several other strictness settings.

### History

This configuration is rooted in the [Canonical React Components Typescript config](https://github.com/canonical/react-components/blob/30cc5e338f1fbca75625a94993bccd6cf902fc28/tsconfig.json). 
It has been generalized to support non-React projects and be more minimal.

The following options have been changed from the original configuration:

- **`"module": "esnext"`** → `"module": "NodeNext"`: For stricter Node-compatible output and module resolution, greater import syntax consistency, and better ESM/CJS interoperability.
- **`"target": "es6"`** → `"target": "ES2023"`
- **`"lib": ["dom", "dom.iterable", "esnext"]`** → `"lib": ["ES2023"]` (`DOM` can be added manually if needed for browser projects)
- **`"strict": false`** → `"strict": true`
- **`"noUnusedParameters": true`** → Subsumed by strict mode
- **`"noUnusedLocals": true`** → Subsumed by strict mode
- **`"noImplicitReturns": true`** → Subsumed by strict mode
- **`"noFallthroughCasesInSwitch": true`** → Subsumed by strict mode
- **`"skipLibCheck": true`** → Disabled for stricter dependency type checking
- **`"esModuleInterop": true`** → Subsumed by `"module": "NodeNext"`, which combines Node configuration with ESM interoperability
- **`"allowSyntheticDefaultImports": true`** → Disabled for stricter import checking

### Caveats

#### `NodeNext` vs. `Node` module resolution

When using TypeScript's NodeNext module resolution, TypeScript expects files to follow Node.js's ES Module (ESM) resolution rules, which require explicit .js extensions for imports. This approach matches ESM conventions, where the index.js file must be specified. This differs from Node module resolution, which defaults to CommonJS and allows directory imports without specifying an index file.
Best Practices:

    Use Explicit File Extensions: With NodeNext, include file extensions (e.g., ./Button/index.js).
    Maintain an index.ts for Exports: Collect all exports in a single index.ts at the package root for easier imports.
    Consider the Module Type: Use Node resolution if CommonJS is preferred; otherwise, NodeNext for ESM compliance.

This approach maintains compatibility with both Node.js and bundlers.

In other words, by using NodeNext, we are aiming at compatibility with the ES Module specification, and this requires importing explicitly `mymodule/index.js` files instead of simply `mymodule/`
