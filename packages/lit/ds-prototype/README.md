# @canonical/lit-ds-prototype

Universal Web Components built with Lit for the Pragma design system. This package provides foundational UI elements that apply across all Canonical web applications: buttons, badges, cards, tooltips, and more.

## Styles

### Every stylesheet is adopted into a shadow root, and none is in a cascade layer

Each component imports its own `styles.css` and hands it to Lit as `static styles`
(for example `src/lib/Button/Button.ts:6` and `:25`). Lit turns that into a
constructable stylesheet and adopts it into the component's shadow root. No
component overrides `createRenderRoot`, so nothing in this package renders into
the light DOM and no stylesheet here ever reaches the document.

That is why these sheets carry no `@layer` wrapper, unlike the React and Svelte
component packages. A shadow tree is its own cascade context: the document's
`@layer` order statement — the one `@canonical/styles` declares, which ranks
`ds.components.global` and `ds.components.app` — does not order layers declared
inside a shadow root, and a document rule cannot select a shadow-tree element at
all (verified in Chromium: a `.ds.button` rule in `ds.components.global` in the
document leaves the button inside `<ds-button>`'s shadow root untouched). So a
wrapper here would arbitrate nothing.

It would not be merely useless. Inside one sheet, an unlayered rule beats a
layered one whatever the order, so wrapping the sheet's current contents and
leaving the next rule someone adds outside the block would hand that new rule an
unconditional win over everything above it — a trap the unwrapped sheet does not
have. Measured on this package's own Button sheet: with the wrapper, an
unlayered `.ds.button { background-color: … }` placed *before* the block wins;
without it, the component's own later rule wins, as source order says it should.

**Rule for contributors:** as long as a stylesheet in this package is only ever
adopted into a shadow root, leave it unlayered. If a component ever renders into
the light DOM — `createRenderRoot() { return this }`, or a sheet imported into
the document — that sheet is document CSS and belongs in
`@layer ds.components.global { … }` like the other global-tier packages.

### The `ds` marker on the host

`@canonical/styles` writes its element-level layers inside `@scope (.ds)`, so
they reach only elements in design-system territory. That scope stops at the
shadow boundary in both directions: it never reaches inside a shadow root, and
the class on the host does not change what the shadow tree computes. What the
marker does change is the **host's own** box and the values the shadow tree
inherits through it. Measured on a page whose root is not marked: adding `ds` to
a `<ds-button>` host moves the host from `content-box` to `border-box` and from
the browser's default text colour to pragma's. Components in this package do not
put `ds` on their host today; on a page whose root carries `ds` — every Storybook
page here does — the host is already inside territory and nothing is missing.
