# @canonical/utils

Utility functions for the Pragma design system. This package contains battle-tested helpers that have proven useful across multiple packages.

## Installation

```bash
bun add @canonical/utils
```

## Available Functions

### debounce

Creates a debounced version of a function that waits until a specified delay has passed since the last call before executing. Useful for search inputs, resize handlers, and other high-frequency events.

```typescript
import { debounce } from "@canonical/utils";

const debouncedSearch = debounce(async (query: string) => {
  const response = await fetch(`/api/search?q=${query}`);
  return response.json();
}, 300);

// Multiple rapid calls result in only one execution
await debouncedSearch("hello"); // Cancelled by next call
await debouncedSearch("hello w"); // Cancelled by next call
await debouncedSearch("hello world"); // Executes after 300ms

// Cancel a pending execution
const promise = debouncedSearch("query");
promise.cancel();
```

The debounced function returns a promise and includes a `cancel` method. Each new call cancels any pending execution from previous calls.

### throttle

Throttles a function to execute at most once per specified interval. Useful for scroll handlers, continuous input events, and rate-limited operations.

```typescript
import { throttle } from "@canonical/utils";

const throttledResize = throttle(() => {
  console.log("Window resized");
}, 500);

window.addEventListener("resize", throttledResize);
// Logs at most once every 500ms during continuous resizing
```

### humanizeNumber

Formats numbers for human readability with appropriate suffixes and precision.

```typescript
import { humanizeNumber } from "@canonical/utils";

humanizeNumber(1234); // "1.2K"
humanizeNumber(1234567); // "1.2M"
```

### pluralize

Returns the singular or plural form of a word based on a count.

```typescript
import { pluralize } from "@canonical/utils";

pluralize(1, "item", "items"); // "item"
pluralize(5, "item", "items"); // "items"
```

### casing

Converts strings between different case conventions.

```typescript
import { casing } from "@canonical/utils";

casing.toCamelCase("hello-world"); // "helloWorld"
casing.toKebabCase("helloWorld"); // "hello-world"
```

### invariant

Throws an error if a condition is false. Useful for asserting assumptions in code.

```typescript
import { invariant } from "@canonical/utils";

invariant(user != null, "User must be defined");
// TypeScript now knows user is not null
```

## Design Philosophy

Functions only enter this package after proving useful across multiple packages. Premature abstraction is actively avoided. If a utility is only needed in one place, it belongs in that package until a second use case emerges.

Each function is fully typed with comprehensive JSDoc comments. The package has no runtime dependencies, keeping bundle impact minimal.
