# Storybook theme toggle broken by cascade layer conflict

## Problem

The Storybook light/dark theme toggle (via `@storybook/addon-themes` `withThemeByClassName`) has no effect. Stories always render in dark mode on systems with `prefers-color-scheme: dark`.

## Root cause

`packages/styles/main/src/index.css` (line 33) declares:

```css
:root {
  color-scheme: light dark;
}
```

This rule is **unlayered** — it sits outside any `@layer`.

Meanwhile, `@canonical/design-tokens/dist/modifiers.theme.css` declares the `.light`/`.dark` overrides **inside** `@layer ds.modifiers`:

```css
@layer ds.modifiers {
  .light { color-scheme: light; }
  .dark  { color-scheme: dark;  }
}
```

Per the CSS cascade spec, **unlayered rules always beat layered rules** regardless of specificity. So when `withThemeByClassName` adds `.light` to `<html>`, the layered `.light { color-scheme: light }` loses to the unlayered `:root { color-scheme: light dark }`, and `light-dark()` continues resolving based on OS preference.

## Fix

The unlayered `:root { color-scheme: light dark }` in `packages/styles/main/src/index.css` is redundant — `modifiers.theme.css` already sets the same declaration on `:root` inside `@layer ds.modifiers`.

**Remove lines 32-35 from `packages/styles/main/src/index.css`:**

```diff
-/* Establish color-scheme for light-dark() support */
-:root {
-  color-scheme: light dark;
-}
```

This puts all `color-scheme` declarations at the same layer level (`ds.modifiers`), so `.light`/`.dark` class selectors win by specificity over `:root`.

## Scope of impact

This affects **all** Storybooks in the monorepo, not just the hub. Any Storybook importing `@canonical/styles` has this cascade conflict. The `ds-global-form` storybook works around it with a custom decorator that sets `document.documentElement.style.colorScheme` imperatively, bypassing CSS entirely.

Once the fix is applied, the `ds-global-form` custom decorator override can also be removed — the shared `previewConfig` with `withThemeByClassName` will work everywhere.

## Files involved

- `packages/styles/main/src/index.css` — remove the unlayered `:root` rule
- `configs/storybook/src/previewConfig.ts` — already correct (uses `withThemeByClassName`)
- `packages/react/ds-global-form/.storybook/preview.ts` — can remove the custom `themeDecorator` after fix
