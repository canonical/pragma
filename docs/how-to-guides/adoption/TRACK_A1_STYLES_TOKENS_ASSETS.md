# Track A1 — Add the styles, tokens, and assets to your project

Install pragma's stylesheet, fonts, and icon assets so that pragma components can render correctly — without changing how your application looks today.

| | |
|---|---|
| **Track** | A1 (family A) |
| **Difficulty** | Low, but may require iterations |
| **Estimated time** | ~5 minutes on the happy path; allow a few days if visual regressions need iterating on |
| **Prerequisites** | React ≥ 19.2.4 app, bundler that resolves package specifiers in CSS (see the [program requirements](./README.md#requirements)) |

## Who this is for

Engineers on a team adopting pragma for 26.10. This is the first track: [A2 (base components)](./TRACK_A2_BASE_COMPONENTS.md) and [A3 (form components)](./TRACK_A3_FORM_COMPONENTS.md) both depend on it, because pragma components resolve their colours, spacing, typography, and icons through what you install here.

## What "done" means

- [ ] `@canonical/styles` and `@canonical/ds-assets` are installed and imported.
- [ ] Text renders in Ubuntu Sans (unless your app already loads it another way).
- [ ] `GET /icons/<name>.svg` serves the corresponding icon from `@canonical/ds-assets`.
- [ ] Your application has **no visual regressions** compared to before this track.

## The path

### 1. Install the packages

```bash
bun add @canonical/styles @canonical/ds-assets
# or: npm install @canonical/styles @canonical/ds-assets
```

`@canonical/styles` is the single stylesheet entry point: a deterministic cascade (`normalize`, `ds.reset`, `ds.modifiers`, `ds.components` layers) that loads the reset, the typography engine, and the design tokens. `@canonical/ds-assets` carries the Ubuntu Sans variable fonts and the icon SVGs.

### 2. Import the styles — fonts first

In your main CSS file, add the fonts import **above** the styles import:

```css
@import "@canonical/styles/fonts"; /* skip if Ubuntu fonts are already loaded, e.g. by vanilla-framework */
@import "@canonical/styles";
```

`@canonical/styles` loads the design tokens and base CSS but **not** the `@font-face` rules — those live in the separate `@canonical/styles/fonts` subpath, and their `url()`s resolve into `@canonical/ds-assets`, which is why that package must be installed.

### 3. Serve the icons at `/icons`

Pragma's `Icon`, `Spinner`, and any icon-bearing component (for example the `Accordion` caret) reference SVGs at runtime by URL — `/icons/<name>.svg#<name>` — rather than bundling them. Your app must serve the `@canonical/ds-assets` `icons/` directory at `/icons`.

How you do that depends on your serving setup: copy or symlink `node_modules/@canonical/ds-assets/icons` into whatever your framework serves as static files, or point a static-file route at it. The contract is simply that `GET /icons/<name>.svg` returns the corresponding file.

Notes:

- If the icons are not served, icon components mount but render **empty** (the SVG `<use>` resolves to nothing) — there is no error.
- `Icon` and `Spinner` accept a `rootPath` prop (default `/icons`) to serve from a different path per instance, e.g. `<Spinner rootPath="/assets/icons" />`. CSS-referenced icons (like the `Accordion` caret) are fixed at `/icons`.

### 4. Storybook (if you use it)

Storybook users get all of this for free: [`@canonical/storybook-config`](https://www.npmjs.com/package/@canonical/storybook-config) serves `@canonical/ds-assets` via `staticDirs` and loads `@canonical/styles/fonts` through its bundled addon, so fonts and icons work with no extra `.storybook` configuration.

## Verify

1. **Fonts** — in the browser dev tools, check that body text computes to the `Ubuntu Sans` font family.
2. **Icons** — with your dev server running (adjust the port to yours):

   ```bash
   curl -sI http://localhost:5173/icons/chevron-down.svg | head -1   # expect HTTP 200
   ```

3. **No regressions** — run your visual regression suite (or do a manual sweep of your main screens). The styles ship a reset and base rules; if they collide with your existing global CSS, iterate until your app looks the way it did before, and report anything that can't be resolved locally (see below).

## If you get stuck

File an issue at [canonical/pragma/issues](https://github.com/canonical/pragma/issues) with a screenshot and the smallest reproducing CSS. Style collisions with existing global stylesheets are exactly the feedback the design team needs from this track.

## Next

[Track A2 — implement the base components](./TRACK_A2_BASE_COMPONENTS.md).
