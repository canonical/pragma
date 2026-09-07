# Architecture

A stub. Sections are added here as the architecture they describe is written down; the package-level
`ARCHITECTURE.md` files point at this one for what is shared across the monorepo.

## The cascade

Every rule the design system's stylesheets ship that declares style sits in a named cascade layer,
and one statement fixes their order; `@font-face`, which names a font rather than styling an element,
is the one thing deliberately left outside. The rules that select bare elements — the reset, the
root's baseline, the typographic engine — style the whole page, as a reset does, and no markup has to
opt in. A page that also runs another CSS framework takes those three layers from
`@canonical/styles-vanilla-adapter` instead, in a copy confined to the subtrees the design system
owns.

[The cascade contract](STYLES_CASCADE.md) explains how a browser arrives at that arrangement, what each layer
is for, where that confinement lives and why it is not here, and what a bundler does to the statement.
