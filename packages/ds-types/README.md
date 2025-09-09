## Canonical Pragma Types

This package contains shared Typescript types used across Pragma.

### File structure

This package is organized into families of types, each in their own folder within `src/`. 

- `src/`: Source files for the package
  - `index.ts`: Main entry point exporting all types
  - `modifiers/`: Global design system modifier types. These are used to modify the appearance of UI blocks.
    - `severity`: Types for severity modifiers (e.g., 'positive`, `negative`, `information`, etc.)

### Constants

Some types are derived from constants defined within their modifier folders. This allows runtime access to the same values used in type definitions.
These constants are defined as uppercased versions of the type derived from them, and are defined in the `<modifierFamilyName>.ts` file within modifier folders.
