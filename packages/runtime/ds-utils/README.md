# @canonical/ds-utils

Framework-agnostic helpers for the Pragma design system. These are the utilities the design system's own components are built on — navigation-tree logic, rate limiting and number formatting — shared by the React and Svelte implementations alike.

For generic string and assertion helpers with no design-system meaning (`casing`, `invariant`, `indent`, `join`), see [`@canonical/utils`](../../utils/README.md).

## Installation

```bash
bun add @canonical/ds-utils
```

## Available Functions

### navigation

Tree helpers and reducers behind the design system's navigation components — breadcrumbs, contextual menus, side navigation. They operate on the `Item` types from `@canonical/ds-types`.

```typescript
import { annotateTree, getItemId, prepareIndex } from "@canonical/ds-utils";

// `root` is a single Item whose children hang off `root.items`.
const tree = annotateTree(root); // adds parentUrl and depth to every node
const index = prepareIndex(tree); // O(1) lookup by url or key
const id = getItemId(root); // the item's url, else its key
```

The module also exports `resolveOrientation`, `findAncestorPath`, `getParentItem`,
`getFirstEnabledChild`, `getFirstEnabledLeaf`, `getLastEnabledChild`,
`createNavigationReducer` and `createCrossGroupStateReducer`, plus the navigation
action and orientation types.

### debounce

Creates a debounced version of a function that waits until a specified delay has passed since the last call before executing. Useful for search inputs, resize handlers, and other high-frequency events.

```typescript
import { debounce } from "@canonical/ds-utils";

const debouncedSearch = debounce(async (query: string) => {
  const response = await fetch(`/api/search?q=${query}`);
  return response.json();
}, 300);

// Multiple rapid calls result in only one execution
debouncedSearch("hello").then(console.log); // Superseded by the next call
debouncedSearch("hello w").then(console.log); // Superseded by the next call
debouncedSearch("hello world").then(console.log); // Executes after 300ms

// Cancel a pending execution
debouncedSearch("query");
debouncedSearch.cancel(); // `cancel` lives on the debounced function
```

The debounced function returns a promise and has a `cancel` method. `cancel` is a
property of the function, not of the promise it returns, and it only clears the
pending timer — the promise for a cancelled call never settles. Each new call
clears the pending timer, so only the last call in a burst settles — a superseded
promise never resolves, which is why the examples above use `.then` rather than
`await`.

### throttle

Rate-limits a function so a burst of calls costs one invocation. The call fires on the trailing edge: once the calls stop, and `wait` milliseconds after the last one. Useful for scroll handlers, continuous input events, and rate-limited operations.

```typescript
import { throttle } from "@canonical/ds-utils";

const throttledResize = throttle(() => {
  console.log("Window resized");
}, 500);

window.addEventListener("resize", throttledResize);
// Logs once, 500ms after the resizing stops
```

### humanizeNumber

Formats numbers for human readability with appropriate unit suffixes and precision. It returns a `HumanizeResult` — the string to display, the original value, and the unit that was applied — so a caller can render the unit separately, for example in an aria-label.

```typescript
import { humanizeNumber } from "@canonical/ds-utils";

humanizeNumber(1234); // { displayValue: "1.2k+", value: 1234, unit: "k" }
humanizeNumber(1500000); // { displayValue: "1.5M", value: 1500000, unit: "M" }
```

The value is truncated to three characters, and `overflowIndicator` (`"+"` by
default) is appended whenever that truncation loses precision. Units, the
magnitude base and the overflow indicator are all configurable through
`HumanizeNumberOptions`.

### pluralize

Returns the singular or plural form of a word based on a count. With no options it pluralizes `"item"`; with only a `singular` it appends an `s`.

```typescript
import { pluralize } from "@canonical/ds-utils";

pluralize(1); // "item"
pluralize(5); // "items"
pluralize(1, { singular: "box", plural: "boxes" }); // "box"
pluralize(3, { singular: "box", plural: "boxes" }); // "boxes"
```

### AllOrNone

A type helper for props where a group of fields must be supplied together or not at all.

```typescript
import type { AllOrNone } from "@canonical/ds-utils";

type Example = AllOrNone<{ a: string; b: number }>;

const both: Example = { a: "hello", b: 42 }; // OK
const neither: Example = {}; // OK
const partial: Example = { a: "hello" }; // Error
```

## Design Philosophy

Functions only enter this package after proving useful across multiple packages. Premature abstraction is actively avoided. If a utility is only needed in one place, it belongs in that package until a second use case emerges.

Each function is fully typed with comprehensive TSDoc comments. The package's only dependency is `@canonical/ds-types`, from which it uses types alone, so it adds no runtime weight of its own.
