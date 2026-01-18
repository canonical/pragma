# Webarchitect Adoption Plan

## Goal

Maximize usage of `@canonical/webarchitect` across all packages in the monorepo to enforce consistent architecture, configuration, and coding standards.

## Principles

1. **Per-package dependency** - Add `@canonical/webarchitect` to each package's `devDependencies` (not workspace root). This ensures packages work standalone when installed outside the monorepo.

2. **Explicit versioning** - Use `^0.10.0` (actual version with caret) rather than `workspace:*`.

3. **Explicit script name** - `check:webarchitect` (no shorthands).

4. **Learning mode** - Rulesets are not fully mature. Expect to discover issues and iterate. Document all findings.

---

## What the `package` Ruleset Validates

Before rolling out, understand what will be checked:

### biome.json
- Must have `extends` containing `@canonical/biome-config`
- Must have `$schema` property
- Only `files.includes` allowed as additional configuration

### package.json
- `name` must match pattern `^@canonical/`
- `version` must be a string
- `type` must be exactly `"module"`
- `module` must be exactly `"dist/esm/index.js"`
- `types` must be exactly `"dist/types/index.d.ts"`
- `files` array must contain `"dist"`
- `license` must be exactly `"GPL-3.0"`
- `scripts.build` must exist
- `scripts.test` must exist
- `scripts.check:ts` must be exactly `"tsc --noEmit"`

---

## Phase 1: Pilot

### Packages (3)

| Package | Rationale |
|---------|-----------|
| `@canonical/utils` | Standard utility library, high likelihood of passing |
| `@canonical/webarchitect` | Dogfooding - the tool should validate itself |
| `@canonical/ds-types` | Types-only package, may reveal edge cases |

### Changes per package

```json
{
  "devDependencies": {
    "@canonical/webarchitect": "^0.10.0"
  },
  "scripts": {
    "check:webarchitect": "webarchitect package"
  }
}
```

### Steps

1. Add `@canonical/webarchitect` to `devDependencies`
2. Add `check:webarchitect` script
3. Run `bun install` (or equivalent)
4. Run `bun run check:webarchitect`
5. Document results (see Phase 2)

---

## Phase 2: Evaluate & Adjust

For each failure, categorize:

| Category | Action |
|----------|--------|
| **Package issue** | Fix the package to conform |
| **Ruleset too strict** | Relax the rule in `package.ruleset.json` |
| **Ruleset too loose** | Tighten the rule |
| **Fundamental mismatch** | Create specialized ruleset or document exception |

### Expected Issues

| Package Type | Likely Issue | Resolution |
|--------------|--------------|------------|
| **Styles packages** | No `module`/`types` entry, no TypeScript | Create `package-styles` ruleset |
| **Assets packages** | Different entry points, no TS | Create `package-assets` ruleset or extend `package` |
| **Storybook addons** | Different peer deps conventions | May need `package-storybook` ruleset |

### Documentation

Create findings document at `./session/B.WEBARCHITECT_FINDINGS.md` with:
- Package name
- Pass/fail status
- Each failing rule and reason
- Recommended action (fix package vs adjust ruleset)

---

## Phase 3: Expand

After Phase 2 adjustments, roll out by category:

| Order | Category | Count | Ruleset |
|-------|----------|-------|---------|
| 1 | Foundation | 2 remaining | `package` |
| 2 | React | 5 | `package-react` |
| 3 | Styles | 8 | `package` or `package-styles` |
| 4 | Storybook | 2 | `package` or `package-storybook` |
| 5 | Svelte | 1 | `package` |
| 6 | Generator | 1 | `package` |

### Per-category steps

1. Identify the correct ruleset
2. Add devDependency and script to all packages in category
3. Run checks
4. Fix issues or adjust ruleset
5. Move to next category

---

## Phase 4: CI Integration

Once all packages have `check:webarchitect`:

```bash
# Run across all packages
npx nx run-many --target=check:webarchitect

# Or with lerna
npx lerna run check:webarchitect
```

Add to CI pipeline to enforce on PRs.

---

## Package Inventory

### Foundation (5)
- [ ] `@canonical/utils`
- [ ] `@canonical/ds-types`
- [ ] `@canonical/ds-assets`
- [ ] `@canonical/typography`
- [ ] `@canonical/webarchitect`

### Styles (8)
- [ ] `@canonical/styles`
- [ ] `@canonical/styles-primitives-canonical`
- [ ] `@canonical/styles-elements`
- [ ] `@canonical/styles-modes-canonical`
- [ ] `@canonical/styles-modes-density`
- [ ] `@canonical/styles-modes-intents`
- [ ] `@canonical/styles-modes-motion`
- [ ] `@canonical/styles-debug`

### React (5)
- [ ] `@canonical/react-ds-app`
- [ ] `@canonical/react-ds-global`
- [ ] `@canonical/react-ds-global-form`
- [ ] `@canonical/react-ds-app-launchpad`
- [ ] `@canonical/react-ssr`

### Storybook (2)
- [ ] `@canonical/storybook-addon-msw`
- [ ] `@canonical/storybook-addon-baseline-grid`

### Svelte (1)
- [ ] `@canonical/svelte-ssr-test`

### Generator (1)
- [ ] `@canonical/generator-ds`

---

## Success Criteria

- All packages have `check:webarchitect` script
- All packages pass their respective ruleset validation
- CI enforces validation on PRs
- Rulesets are documented and stable
