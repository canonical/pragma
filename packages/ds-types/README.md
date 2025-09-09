## Canonical Pragma Types

This package contains shared Typescript types used across Pragma.

### File structure

This package is organized into families of types, each in their own folder within `src/`. 

- `src/`: Source files for the package
  - `index.ts`: Main entry point exporting all types
  - `modifierFamilies`: Global design system modifier types. These are used to modify the appearance of UI blocks.

### Constants

Some types are derived from constants defined within their modifier folders. This allows runtime access to the same values used in type definitions.
These constants are defined as PASCAL_CASED versions of the type derived from them, and are defined in the `constants.ts` file within modifier folders.
