---
name: adoption-a1-styles
description: Adopt Canonical design-system styles, fonts, and icons in an application (adoption track A1); also runs as a guided tutorial on a worked example
---

# Adoption A1 — Styles, fonts, icons

The first track of adopting the design system: the visual foundation — reset,
typography, tokens, fonts, icons — before any component swap. Complete this track and
the app looks and reads like the design system even while it still renders its old
components.

## When to Use

- Starting design-system adoption in an application — this is the first track
- The app needs the visual foundation (reset, typography, tokens, fonts, icons) before
  any component swap

## When NOT to Use

- The foundation is already installed and verified — continue with
  `adoption-a2-components`
- Authoring design-system content rather than adopting it — see `specify-component`
  and its sibling skills

## Opening move: ask, or offer the tutorial

Activation is an opening, not a starting gun. Unless the first message already names
the work, ask for the starting point — as a suggestion carrying an example, not as a
form to fill in:

> To get started, point me at the app — the repo or directory — and say whether it
> already pulls in any Canonical styles.

"I don't know what's in there" is a fine answer: the install and verify steps
establish it. Ask again only for what the next step genuinely blocks on.

If the activation message already carries the starting point, do not re-ask — say what
you took it to be, and go.

Offer the tutorial in the same breath, because this track doubles as one:

> Or if you'd rather see what this track changes before touching your app, I can run
> it as a tutorial: I'll take a plausible example — a small Vite React app — and walk
> you through the track on it.

Tutorial mode is the step narration below, turned up: the same outcome-path-conclusion
frame, with the reasoning behind each change made explicit. It runs on a scratch
example, not on the person's app — nothing in their repo changes unless they ask.

## Every step is narrated: outcome, path, conclusion

Every step is addressed to the person — once before it runs, once when it ends. This is
not tutorial manner. It holds in the ordinary flow too: the person is the design
authority, and they can only steer a step they saw coming. A decision gate met cold is
a decision they cannot really make.

**Open** the step with what it is FOR — the outcome it should leave behind — and how
you are about to get there. **Close** it with a sentence saying what it established and
what that means for the step after. One sentence each is enough; the failure mode is
silence, not length, and a step whose outcome looks obvious still gets its sentence
rather than a shrug.

Do:

> **Fonts, then styles.** The outcome is an app whose type and tokens come from the
> design system, with the fonts loaded before the styles that expect them. The path is
> the two `@import` lines below, in the root stylesheet, fonts first.
>
> …
>
> So: type and tokens are live and Ubuntu Sans is self-hosted — which leaves the
> surface classes as the step that decides whether the density channel emits real
> values at all.

Don't:

> Added the two imports. Fonts load.

Both carry the same facts. Only the first says what the step was trying to achieve and
what it settled — and only the first lets the person cut in with the thing they know
and the graph does not, which is the whole reason they are here.

## Asked about the skill: methodology and outcomes first

A question about what this skill does — what it covers, what its steps are, how it
works — is answered in that order: the METHOD it applies and the OUTCOMES it leaves
the person holding come first, the step-by-step breakdown comes after.

Two or three sentences of method is enough: what the skill treats as its object, the
discipline that makes it work, and what exists at the end that did not exist before.
The enumeration then reads as steps in service of something, rather than as a list to
be got through.

What this prevents is a table of contents standing in for an answer. A reply opening
with the step names tells someone who already knows the skill nothing new, and someone
who does not, nothing at all.

So, asked what this skill is:

> It installs the visual foundation — reset, typography, tokens, fonts, icons — before
> any component is swapped, under the live code standards. Complete it and the app
> looks and reads like the design system while it still renders its old components,
> which is what makes every later track land on the right ground.

Then, and only then, the breakdown.

## Install

```bash
bun add @canonical/styles @canonical/ds-assets
```

One import of `@canonical/styles` aggregates the normalize/reset, typography, and design
tokens. Two things come with it:

- Cascade layers `@layer normalize, ds.reset, ds.modifiers, ds.components` — component
  styles beat modifiers beat reset regardless of import order, so adopting apps do not
  fight specificity.
- `color-scheme: light dark` on `:root` — the foundation is theme-aware out of the box.

## Code standards are the gate

Styling work in this track falls under the live code standards — the `styling`, `css`,
and `icons` categories at minimum (take the actual set from the live output, not from
this list). Pull them BEFORE touching a stylesheet and hold the Do/Don't pairs open
while editing, so they shape the change as it is written, not only in review:

```bash
pragma standard categories                 # the live category set — never from memory
pragma standard list --category styling    # repeat per applicable category
pragma standard lookup <name> --detail detailed
```

Apps follow the code standards as closely as the work allows. Where a change has to
deviate from a pulled standard, record the deviation in the PR next to the standard's
name — and ideally file it as an issue, either to bring the app into line later or to
propose a change to the standard itself. The standards apply even when the app has no
pragma dependency, and they are open to contribution: a missing or wrong standard is
something to propose a change for, not to silently work around.

## Fonts before styles

Fonts are opt-in and must be imported FIRST. The canonical form, in the root stylesheet:

```css
@import url("@canonical/styles/fonts");
@import url("@canonical/styles");
```

(Equivalent JS-side: import the fonts CSS, then `import "@canonical/styles"`.) The
fonts entry loads Ubuntu Sans as variable fonts, self-hosted from
`@canonical/ds-assets` via its `@font-face` rules — no external font host.

## Declare the surface: context and density classes

The density system is class-driven, and it starts at the root. The app's root element
(`<body>`, or the app's root container) must carry TWO classes:

```html
<body class="app comfortable">
```

- **Context** — `app`, `site`, or `docs`: which surface this is. Applications take
  `app`; marketing/brochure surfaces take `site`; documentation surfaces take `docs`
  (`docs` shares `site`'s values).
- **Density** — `comfortable` or `dense`: picks within the context's pair.
  `comfortable` is the default choice unless the product's design calls for `dense`.

The requirement, stated as a rule: the root carries EXACTLY ONE class from each
family — a context (`app` | `site` | `docs`) AND a density (`comfortable` | `dense`).
That makes six valid combinations (`app comfortable`, `app dense`, `site comfortable`,
`site dense`, `docs comfortable`, `docs dense`) and nothing else: a single class, a
value outside either set, or two values from the same family is an invalid surface
declaration. `app comfortable` is the default for applications; adoption is not done
until the root carries a valid pair.

Components never read these classes directly — they read the `--density-*` custom
properties the classes emit (control heights, inline padding, vertical spacing rungs,
baseline seating). A section can locally tighten by carrying its own `dense` class on
an ancestor of just that region.

**Failure mode: missing root classes fail SILENTLY.** The primitives fall back to
app-comfortable values, so an application looks right by accident — while a site or
docs surface, or any intended `dense` region, quietly renders with the wrong control
heights and spacing. This step has historically been forgotten precisely because
nothing errors. If control heights or spacing look subtly off, check the root classes
before debugging component CSS.

## The /icons serving contract (and its silent failure)

Icons are per-file SVGs in `@canonical/ds-assets` (`icons/<name>.svg`, 16x16 viewBox,
`currentColor` fill, a single `<g id="<name>">`), referenced at RUNTIME: the React
`Icon` component renders

```html
<use href="/icons/<name>.svg#<name>" />
```

with `rootPath="/icons"` as the default, overridable via the `rootPath` prop.

**The app must expose `@canonical/ds-assets`' `icons/` directory at `/icons`** — copy or
symlink it into the static dir, or add a static mount in the server/bundler config — or
pass `rootPath` to point where the app does serve them.

**Failure mode: an unserved icon renders EMPTY, silently.** No error, no broken-image
glyph — an external `<use>` reference that 404s resolves to nothing. If icons "don't
show up", check the network tab for `/icons/<name>.svg` before debugging anything else.

For TypeScript apps, the valid icon names ship as data:

```ts
import { ICON_NAMES, type IconName } from "@canonical/ds-assets";
```

## Storybook freebies

```bash
bun add -d @canonical/storybook-config
```

```ts
// .storybook/main.ts
import { createConfig } from "@canonical/storybook-config";

export default createConfig("react"); // or "svelte" | "sveltekit" | "lit"
```

This single call:

- serves the whole `@canonical/ds-assets` package via `staticDirs`, so `/icons/*` just
  works in Storybook — do not mistake that for your APP serving them;
- ships the shared addons and shell theme;
- fixes the full-height preview chain.

One caveat: declare `tags: ["autodocs"]` inline in your own `.storybook/preview.ts` —
Storybook statically parses that file and does not reliably pick up tags spread from an
imported preview.

## Verify

- [ ] Computed `font-family` on body text shows Ubuntu Sans.
- [ ] The root element carries one context class (`app`/`site`/`docs`) and one
      density class (`comfortable`/`dense`).
- [ ] Computed `--density-line-height` on a control matches the intended cell
      (e.g. `32px` for app-comfortable, `36px` for site-comfortable) — a fallback
      value on a class-less root passes visual inspection and still fails this check
      on non-app surfaces.
- [ ] `/icons/<name>.svg` returns 200 with SVG content, and an icon visibly renders.
- [ ] The `@layer normalize, ds.reset, ds.modifiers, ds.components` rule is present in
      the served CSS.
- [ ] Typography baseline behaves. Note: the baseline grid is computed with the CSS
      `mod()` function and cannot be downleveled — check the support table in the
      `@canonical/styles-typography` README against the browsers you target.

## Next

Foundation in place — continue with `adoption-a2-components`.

## Support

If this skill leads somewhere broken — a command that errors, guidance that
contradicts what the live system answers, a gap the flow cannot cover — you are not
stuck:

- Raise an issue in the pragma repo: https://github.com/canonical/pragma/issues —
  include the skill name, what was run, and expected vs. actual outcome.
- Or contact the design-system team owners directly through your organization's
  professional messaging channels for assistance.
