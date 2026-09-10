# @canonical/dataviews-core

Framework-agnostic core for Canonical collection views. It will hold the query grammar, lifecycle transition contracts, row and cell projections, and shared table geometry that framework bindings build on — logic, never markup. The current surface is the runtime identity-token foundation described under Status.

> **Stability: pre-1.0 / experimental.** The API is still consolidating and breaking changes may land between minor versions. Every breaking change ships with a conventional-commit subject and a CHANGELOG entry — those are the migration record. Pin a minor version if you need stability today.

## Installation

```bash
bun add @canonical/dataviews-core
```

## Status

This package is under active development and its public surface grows change by change. The current exports mint and check runtime identity tokens — the referential markers that later contracts use to keep a value created against one DataViews scope (a provider, a column set) from being silently consumed by another:

```ts
import { createIdentity, isIdentity } from "@canonical/dataviews-core";

const providerScope = createIdentity();

// At a scope boundary, values arrive untyped; the guard narrows them.
function adoptScopeToken(value: unknown) {
  if (!isIdentity(value)) {
    throw new Error("Expected a DataViews scope token");
  }
  return value; // value: Identity
}
```

Comparing identities is referential (`tokenA === tokenB`); tokens carry no key, label, or serialized data, and structural copies of a token are not tokens. Query grammar, lifecycle transitions, projections, and geometry contracts land in subsequent changes.
