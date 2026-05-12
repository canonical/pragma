# Error Recovery Heuristics

How `@canonical/pragma-cli` enriches error diagnostics beyond a static message. Each heuristic is a single piece of logic that applies uniformly across all domains sharing the same error code.

---

## Overview

Every domain operation that fails throws a `PragmaError` with a machine-readable code, optional recovery hints, and contextual metadata. Heuristics run at the moment of failure — inside the per-item lookup function or the orchestration layer — and attach additional fields to the error before it propagates to the CLI renderer or MCP serializer.

Error flow:

```
operation (lookup / list)
  ↓ failure detected
  ├─ H1: suggestNames(query, candidates) → suggestions
  ├─ H2: detectCrossDomain(query, domain, store) → crossDomain
  ├─ H3: count unfiltered items → enriched message
  └─ throw PragmaError (with suggestions, crossDomain, enriched message)
        ↓
  lookupMany collects errors (H4: propagates suggestions)
        ↓
  ┌─────────────┐    ┌──────────────────┐
  │ CLI renderer │    │ MCP serializer   │
  │ (plain/llm)  │    │ (JSON envelope)  │
  └─────────────┘    └──────────────────┘
```

---

## H1: Fuzzy Name Suggestions

**Purpose:** When a lookup fails, suggest names the user likely intended.

**Error code:** `ENTITY_NOT_FOUND`

**Domains:** block, token, modifier, standard

**Function:**

```typescript
suggestNames(query: string, candidates: string[], opts?: {
  maxResults?: number;   // default: 5
  threshold?: number;    // default: 0.4 (normalized edit distance)
}): string[]
```

**Algorithm:** Damerau-Levenshtein distance, case-insensitive. Prefix matches score 0 (highest rank). Edit-distance matches are normalized by `distance / max(queryLen, candidateLen)` and filtered by threshold. Results sorted by score, capped at `maxResults`.

**CLI output:**

```
Error: block "Buton" not found.

Did you mean?
  - Button

Run `pragma block list`
```

**MCP output:**

```json
{
  "ok": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "block \"Buton\" not found.",
    "suggestions": ["Button"],
    "recovery": { "tool": "block_list" }
  }
}
```

**File:** `src/domains/shared/suggestions/suggestNames.ts`

---

## H2: Cross-Domain Detection

**Purpose:** When a name is not found in the requested domain, check if it exists in a different domain and redirect.

**Error code:** `ENTITY_NOT_FOUND`

**Domains:** block, token, modifier, standard (cross-checked against each other)

**Function:**

```typescript
detectCrossDomain(
  name: string,
  currentDomain: string,
  store: Store,
): Promise<CrossDomainHint | undefined>
```

Checks domains in deterministic order: block → token → modifier → standard. Returns the first match. Skips the current domain.

**CLI output:**

```
Error: token "importance" not found.

"importance" exists as a modifier.
Run `pragma modifier lookup importance`

Run `pragma token list`
```

**MCP output:**

```json
{
  "ok": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "token \"importance\" not found.",
    "recovery": { "tool": "token_list" },
    "crossDomain": {
      "domain": "modifier",
      "tool": "modifier_lookup",
      "params": { "names": ["importance"] }
    }
  }
}
```

**File:** `src/domains/shared/suggestions/detectCrossDomain.ts`

---

## H3: Enriched Empty Results

**Purpose:** When a list returns zero results due to filters, provide context about what is hidden so the user can decide whether to widen.

**Error code:** `EMPTY_RESULTS`

**Domains:** block, token, modifier, standard (via their `*EmptyError` orchestration functions)

**Mechanism:** The orchestration layer runs a second lightweight count query without the restrictive filter when results are empty. The count is injected into the error message. For category-filtered domains, the available categories are also listed.

**CLI output:**

```
Error: No blocks found in tier "apps/lxd". 42 block(s) available across all tiers.

Run `pragma block list --all-tiers`
```

**MCP output:**

The message field contains the enriched text. For category filters, `validOptions` lists available categories.

**Files:** `src/domains/block/orchestration/blockEmptyError.ts` (and token, modifier, standard equivalents)

---

## H4: Multi-Lookup Error Enrichment

**Purpose:** When `lookupMany` collects per-query failures, propagate suggestions from each failed lookup so agents can self-correct without a round-trip.

**Error code:** Inherits from the per-item lookup (typically `ENTITY_NOT_FOUND`)

**Mechanism:** `lookupMany` extracts `suggestions` from caught `PragmaError` instances and includes them in the error entry.

**Contract:**

```typescript
interface LookupResult<T> {
  results: readonly T[];
  errors: readonly {
    query: string;
    code: string;
    message: string;
    suggestions?: readonly string[];  // ← new
  }[];
}
```

**MCP output (partial failure):**

```json
{
  "ok": true,
  "data": {
    "results": [{ "name": "Button" }, { "name": "Card" }],
    "errors": [{
      "query": "Buton",
      "code": "ENTITY_NOT_FOUND",
      "message": "block \"Buton\" not found.",
      "suggestions": ["Button"]
    }]
  }
}
```

**File:** `src/domains/shared/lookupMany.ts`

---

## H5: Glob / Prefix Expansion

**Purpose:** Expand wildcard patterns in lookup names so users and agents can query by prefix (e.g., `react.component.*`).

**Error code:** `EMPTY_RESULTS` (when a glob matches nothing)

**Domains:** block, token, modifier, standard (via their `resolve*Lookup` orchestration functions)

**Functions:**

```typescript
isGlobPattern(name: string): boolean
expandGlob(pattern: string, candidates: string[]): string[]
expandLookupQueries(queries: string[], store: Store, domain: Domain): Promise<{
  names: string[];
  globErrors: { query: string; code: string; message: string }[];
}>
```

**Patterns supported:**
- `*` anywhere: wildcard (`react.component.*`, `Nav*`, `*.props`)
- Trailing `.`: shorthand for `.*` (`react.component.` = `react.component.*`)
- Case-insensitive matching

Non-glob names pass through unchanged to the lookup pipeline.

**CLI usage:**

```
$ pragma standard lookup "react.component.*"
# returns all react.component.* standards

$ pragma standard lookup "nonexistent.*"
# Error: No standards matching "nonexistent.*".
```

**Files:** `src/domains/shared/suggestions/expandGlob.ts`, `src/domains/shared/suggestions/expandLookupQueries.ts`

---

## Adding a new heuristic

1. Create a pure function in `src/domains/shared/suggestions/` with a colocated test file
2. Export from the barrel (`suggestions/index.ts`)
3. Wire into the relevant throw sites (operation or orchestration layer)
4. Update `renderError.ts` if the heuristic adds a new field to CLI output
5. Update `mcp/error/serializeErrorPayload.ts` and `mcp/error/types.ts` if the field appears in MCP responses
6. Add a section to this document
