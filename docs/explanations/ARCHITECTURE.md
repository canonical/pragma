# Architecture

A stub. Sections are added here as the architecture they describe is written down; the package-level
`ARCHITECTURE.md` files point at this one for what is shared across the monorepo.

## The cascade

Every rule the design system's stylesheets ship sits in a named cascade layer whose order one
statement fixes, and the layers whose rules select bare elements apply only inside a subtree marked
with the class `ds`.

[The cascade contract](CASCADE.md) explains how a browser arrives at that arrangement, what each layer
is for, why the element-level layers are scoped, and what a bundler does to the statement.
