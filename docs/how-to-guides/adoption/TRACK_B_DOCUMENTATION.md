# Track B — Document your components

Document every component your team has built in the [Design System Database](https://coda.io/d/Design-System-Database_dNyzE_TLZDh) on Coda, so your work becomes part of pragma's knowledge graph.

| | |
|---|---|
| **Track** | B (family B — independent of family A, can run in parallel) |
| **Difficulty** | Medium |
| **Estimated time** | Proportional to your component count; this is the design-side half-week of the program estimate |
| **Prerequisites** | Access to the Design System Database on Coda; an inventory of the components your team has built |

## Why this matters

By doing this you contribute to the knowledge graph of pragma: the database syncs into the design-system graph, where your components become queryable alongside everything else. It also gives the design system team the right visibility to understand your project and your needs — a full view of the components you have developed, your UX practice, and the opportunities to upstream your components and deduplicate work with other teams.

Coda is the **system of record** for this data. Do not hand-edit the synced files in the design-system repository — they are regenerated from Coda and your edits would be overwritten.

## Who this is for

Designers and engineers of adopting teams — whoever knows the component set best. The anatomy step (Figma embeds) is usually designer-led; the inventory is usually engineer-led. Pairing works well.

## What "done" means

- [ ] Your app exists as a tier in the database.
- [ ] Every component your team has built has an entry in your tier.
- [ ] Every entry has, at minimum, a **summary** and a **screenshot** — a fuller Coda page per component is even better.
- [ ] Every entry carries the tag `documentation status: initial_app_documentation`.

## The path

Everything below happens in the [Design System Database](https://coda.io/d/Design-System-Database_dNyzE_TLZDh).

### 1. Make sure your app exists in the list of tiers

Check the **Tier** view for your app. *(screenshot to follow)*

> **If your app is confidential, stop here and get in touch with the design system team instead. Do NOT enter confidential information on Coda.**

### 2. Open "Components by tier"

It is in the left menu.

### 3. Filter by your tier

Use the view's filters to show only your own tier. *(screenshot to follow)*

### 4. Bootstrap your tier — skip this step if your tier is already visible

A tier with no components yet does not show up in the filtered view. To bootstrap it: create a component using the **+** icon, open it in the single view, then select **Tier** and pick your newly created tier. From then on, your tier appears in the filter.

### 5. Document each component

For each component your team has built:

1. **Add an entry in your tier.** *(screenshot to follow)*
2. **Open it in the single view** — click the expand icon on the left side of the row. *(screenshot to follow)*
3. **Fill the category** — `subcomponent`, `component`, or `pattern`. If you are wondering which applies, the definitions are in the categories table. <!-- TODO: link the categories table -->
4. **Fill the summary** — instructions are given in the database. Overall: just a few lines that properly define and disambiguate the component.
5. **Fill the anatomy** — in *Anatomy classic*, add a Figma embed (preferable) or screenshots. *(screenshot to follow)*
6. **Tag it done** — add the tag `documentation status: initial_app_documentation`. *(screenshot to follow)*

## Verify

1. The filtered "Components by tier" view lists every component your team has built — cross-check the count against your codebase (for example, your component folders under `src/lib`).
2. Every entry has a category, a summary, and a Figma embed or screenshot.
3. Every entry carries the `initial_app_documentation` tag — the tag is how the program tracks Track B progress.

## If you get stuck

Get in touch with the design system team — and always take that route for confidential apps. For everything else, [file an issue](https://github.com/canonical/pragma/issues).

## Next

That completes family B. If family A is still in progress on your team, the [adoption index](./README.md) has the remaining tracks.
