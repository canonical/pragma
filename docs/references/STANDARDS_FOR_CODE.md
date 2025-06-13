# Code Standards Reference

This document outlines the standards and conventions for writing code within Pragma. It aims to ensure consistency,
maintainability, and readability across all code packages.

## Introduction

Our code development practices are guided by the following core principles:

* **Consistency:** Maintain uniform patterns for exports, imports, and type definitions.
* **Type Safety:** Leverage TypeScript's type system to catch errors early and provide better developer experience.
* **Modularity:** Organize code into logical units with clear boundaries and responsibilities.
* **Maintainability:** Write code that is easy to understand, modify, and extend.

## Technology-Specific Standards

For technology-specific standards, please refer to:

- [React Standards](./STANDARDS_FOR_REACT.md) - Standards for React components and development
- [Styling Standards](./STANDARDS_FOR_STYLING.md) - Standards for CSS and styling
- [Testing Standards](./STANDARDS_FOR_TESTING.md) - Standards for writing and organizing tests
- [Packaging Standards](./STANDARDS_FOR_PACKAGING.md) - Standards for package structure, dependencies, and publishing
- [Documentation Standards](./STANDARDS_FOR_DOCUMENTATION.md) - Standards for writing and organizing documentation

## Exports (`code/exports`)

### Default vs Named Exports (`code/exports/default-vs-named`)

Files **shall** have either **one default export** or **multiple named exports**. The name of the file and its domain *
*shall** hint at the type of exports that are provided.

| File                      | Exports                                   | Rationale                                                                                                                                                                                                                      | 
|---------------------------|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| index.ts                  | multiple named exports                    | Usually reexports the contents of the folder to provide a public API                                                                                                                                                           |
| ComponentName.tsx         | single default export                     | Implements a single component, hinting at a single export. Wrappers/subcomponent logic should be provided in separate files when needed.                                                                                       |
| types.ts                  | multiple named exports                    | Provides the required types for the current folder domain, itself potentially consisting of several files and object shapes.                                                                                                   |
| debounce.ts               | single default export                     | We encapsulate the functional logic in a single export. If additional functionality is required, it can live in the same file (if it's not exported) or in another file (for reusable logic).                                  | 
| ComponentName.stories.tsx | multiple named exports (+ default export) | This is an exception, as this file conforms to the storybook standards. While the default export provides a configuration object for component stories, each named export corresponds to a story consuming this configuration. |

> ✅ **Do**
>
> + Use default exports for single-purpose files like components or utility functions.
> + Use named exports for files that provide multiple related exports like types or stories.
> + Name files according to their export pattern (e.g., `ComponentName.tsx` for default exports, `types.ts` for named
    exports).

> ❌ **Don't**
>
> + Mix default and named exports in the same file (except for story files).
> + Use default exports in files that provide multiple related exports.
> + Name files in a way that doesn't reflect their export pattern.

### Named Exports Type Consistency (`code/exports/type-consistency`)

Aside from files named `index.ts`, all files providing named exports **shall** expose a single export shape.

| File            | Exports Type         | Rationale                                                    | 
|-----------------|----------------------|--------------------------------------------------------------|
| stories.ts      | `Story`              | This file is a collection of Storybook Stories               | 
| transformers.ts | `(value:str) => str` | This file is a collection of string transformation functions | 
| fixtures.ts     | `Fixture`            | Mock Data substitutable to one another                       |

> ✅ **Do**
>
> + Identify the shape of the exports of your file before writing its contents.
> + Export objects that share the same type.
>   ```typescript
>   export const myFuncA = (value:str) => {}
>   export const myFuncB = (value:str) => {}
>   export const myFuncC = (value:str) => {}
>   ```

> ❌ **Don't**
>
> + Export objects of different types/shapes from the same file 
>   ```typescript
>   export const transformer = (value:str) => {}
>   export const reducer  = (map:str[]) => {}
>   ```
>   Or : 
>   ```typescript
>   export const transformer = (value:str) => {}
>   Class ABC
>   export { ABC } 
>   ```

## Imports (`code/imports`)

<!-- 
    TODO not sure if we should keep this one, as we break this standard ourselves sometimes. 
    We probably need a clearer idea of when to import * and when to separately import named constants.
-->

### Named Exports Reimport (`code/imports/named-exports`)

When directly importing the contents of a file containing named exports, developers **shall** use the `import * as`
pattern to conserve the namespace.

> ✅ **Do**
> 
> + Conserve the namespaces of named exports when reimporting. 
>   ```typescript
>   import * as transformers from "./transformers.js"
>   ```

> ❌ **Don't**
>
> + Import directly the contents of a file containing named exports. 
>   ```typescript
>   import { myFunc, otherFunc } from "./transformers.js"
>   ```

## File Organization (`code/organization`)

### Directory Structure (`code/organization/directory-structure`)

Each package **shall** follow a consistent directory structure:

```
package/
├── src/           # Source code
├── dist/          # Compiled output
├── docs/          # Documentation, if further docs are needed besides `README.md`
└── index.ts       # Main entry point
```

> ✅ **Do**
> 
> + Keep source code in the `src` directory
> + Place test files directly next to the code they test with a `.tests.<ext>` suffix
> + Use `index.ts` files to define public APIs
> + Keep documentation close to the code it documents

> ❌ **Don't**
>
> + Place tests and code under test in different directories, unless creating end-to-end tests.
> + Place build artifacts in source directories
> + Create deep directory hierarchies (prefer flat structures)

### File Naming (`code/organization/file-naming`)

Files **shall** follow consistent naming conventions:

| Type             | Pattern                | Example                       |
|------------------|------------------------|-------------------------------|
| Source Files     | kebab-case.<ext>       | `debounce.ts`, `invariant.ts` |
| Test Files       | kebab-case.tests.<ext> | `debounce.tests.ts`           |
| Type Definitions | types.<ext>            | `types.ts`                    |
| Documentation    | kebab-case.md          | `getting-started.md`          |

> ✅ **Do**
> + Use kebab-case for file names.
>   + Note: Some frameworks may use non-kebab-case casing, in part or in whole, as a standard. Refer to the
      standard-specific documentation as well. For
      example, [React components should generally use PascalCase](STANDARDS_FOR_REACT.md#file-and-folder-structure-reactfile-structure).
> + Use `.tests.<ext>` suffix for test files
> + Use `types.<ext>` for type definition files
> + Use `.md` extension for documentation

> ❌ **Don't**
>
> + Use camelCase or PascalCase for file names, unless a platform-specific standard allows otherwise.
> + Mix different naming conventions
> + Use non-standard file extensions
> + Create component-named type files (e.g., `button.types.ts`)

## Error Handling (`code/error-handling`)

### Error Types (`code/error-handling/error-types`)

Custom errors **shall** extend the base `Error` class and include relevant context.

```typescript
class ValidationError extends Error {
    constructor(message: string, public readonly context: Record<string, unknown>) {
        super(message);
        this.name = 'ValidationError';
    }
}
```

> ✅ **Do**
>
> + Create specific error types for different error cases
> + Include relevant context in error objects
> + Use descriptive error messages
> + Properly extend the Error class

> ❌ **Don't**
>
> + Throw generic Error objects
> + Omit error context
> + Use non-descriptive error messages

### Error Boundaries (`code/error-handling/error-boundaries`)

Error handling **shall** be implemented at appropriate boundaries:

1. **Input Validation**: Validate all external inputs before processing
2. **Resource Management**: Handle resource cleanup in finally blocks
3. **Async Operations**: Properly handle promise rejections

> ✅ **Do**
>
> + Validate inputs at system boundaries
> + Use try/catch/finally for resource management
> + Handle promise rejections with .catch() or try/catch
> + Log errors with appropriate context

> ❌ **Don't**
>
> + Swallow errors without logging
> + Leave resources unclosed
> + Ignore promise rejections

## Documentation (`code/documentation`)

### Code Comments (`code/documentation/comments`)

Code **shall** be documented with clear, purposeful comments:

1. **JSDoc Comments**: Required for all public APIs
2. **Implementation Comments**: Used to explain complex logic
3. **TODO Comments**: Include ticket references

```typescript
/**
 * Debounces a function call, ensuring it is only executed once
 * within the specified time window.
 *
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    // Implementation
}
```

> ✅ **Do**
>
> + Document all public APIs with JSDoc
> + Explain complex logic with inline comments
> + Include ticket references in TODO comments
> + Keep comments up to date with code changes

> ❌ **Don't**
>
> + Write obvious comments
> + Leave TODO comments without ticket references
> + Document implementation details in public APIs
> + Write comments that duplicate the code

### README Files (`code/documentation/readme`)

Each package **shall** include a README.md file with:

1. Package description
2. Installation instructions
3. Usage examples
4. API documentation
5. Contributing guidelines

> ✅ **Do**
>
> + Keep README files up to date
> + Include clear installation instructions
> + Provide usage examples
> + Document public APIs
> + Include contribution guidelines

> ❌ **Don't**
>
> + Leave README files outdated
> + Omit critical information
> + Include implementation details
> + Duplicate documentation