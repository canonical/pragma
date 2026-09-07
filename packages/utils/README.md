# @canonical/utils

Utility functions for the Pragma design system. This package contains battle-tested helpers that have proven useful across multiple packages.

Design-system helpers — navigation trees, `debounce`, `throttle`, `humanizeNumber`, `pluralize` and the `AllOrNone` type — live in [`@canonical/ds-utils`](../runtime/ds-utils/README.md).

## Installation

```bash
bun add @canonical/utils
```

## Available Functions

### casing

Converts strings between case conventions. Each converter is a flat named export: `capitalize`, `isPascalCase`, `toCamelCase`, `toConstantCase`, `toKebabCase`, `toPascalCase`, `toSnakeCase` and `toTitleCase`.

```typescript
import { toCamelCase, toKebabCase } from "@canonical/utils";

toCamelCase("hello-world"); // "helloWorld"
toKebabCase("helloWorld"); // "hello-world"
```

### invariant

Throws an error if a condition is false. Useful for asserting assumptions in code.

```typescript
import { invariant } from "@canonical/utils";

invariant(user != null, "User must be defined");
// Throws `Invariant violation: User must be defined` when user is null;
// TypeScript now knows user is not null past this line.
```

### indent

Indents every line of a string by a given number of spaces, for generating readable source output.

```typescript
import { indent } from "@canonical/utils";

indent("a\nb", 2); // "  a\n  b"
```

### join

Joins an array into a string, converting each element to a string first.

```typescript
import { join } from "@canonical/utils";

join(["a", "b", "c"]); // "a, b, c"
join([1, 2, 3], " | "); // "1 | 2 | 3"
```

## Design Philosophy

Functions only enter this package after proving useful across multiple packages. Premature abstraction is actively avoided. If a utility is only needed in one place, it belongs in that package until a second use case emerges.

Each function is fully typed with comprehensive TSDoc comments. The package has no runtime dependencies, keeping bundle impact minimal.
