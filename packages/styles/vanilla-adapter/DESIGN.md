# Design notes

How this package works inside, and why the CSS is written the way it is. For installing and using it, see the [README](./README.md).

## The layers

Three facts about the cascade carry the design. An unlayered rule beats every layered rule. A higher layer wins whatever the selectors on either side say. And `revert` rolls a property back to the browser's own default, ignoring every author rule below the one that says it.

`layers.css` puts `vanilla` near the bottom and a `boundary` layer directly above it, with one sublayer of `vanilla` below everything:

```css
@layer vanilla.escapes,
  vanilla,
  boundary,
  normalize,
  ds.tokens,
  ds.reset,
  ds.typography,
  ds.modifiers,
  ds.surfaces,
  ds.states,
  ds.adapter,
  ds.components,
  ds.components.global,
  ds.components.sites,
  ds.components.documentation,
  ds.components.stores,
  ds.components.apps,
  app;
```

The five component layers follow the design system's tier tree, lowest first: `global`, `sites`, `documentation`, `stores`, `apps`. Naming them here means a higher tier's rule for a component beats a lower tier's by layer, whatever order your entry happens to load the component stylesheets in. A package below one of those tiers declares a layer of its own, such as `ds.components.apps-lxd`, after importing the order from `@canonical/styles/layers.css`. Because that name appears later than the statement, it sorts above the five and still below `app`. On a mixed page the extra import changes nothing, since the statement here has already fixed those names. No rule is written directly into `ds.components`, because a rule there would land in that layer's implicit final sublayer and outrank every tier.

The mode bridge writes into `ds.adapter`, which is a sublayer of `ds` rather than a top-level layer, and that matters. Sublayers sort inside their parent, and `ds` takes its place in the order where it is first mentioned, at `ds.tokens`. A top-level layer written between `ds.states` and `ds.components` would therefore not sit between them at all: it would sit above every pragma layer, component tiers included, and a component that sets its own `color-scheme` could never beat the bridge. We measured that: a modal asking for `dark` computed `light`. As a sublayer it sits above the mode modifiers and below the components, which is where the mode rules in the README and a component's own `color-scheme` both need it. The fixtures check all 153 pairs of the eighteen names by computed style rather than by reading the list, and check that a later sub-tier layer sorts where it should.

Pragma's own statement, the same list without `vanilla`, `boundary`, `ds.adapter` and `app`, arrives later through the entries this package imports. It changes nothing, because a later statement can add names but never reorder the ones already fixed, and it adds none.

`app` is the name of your own layer whatever context class the page carries. A site with `class="site …"` still writes `@layer app`.

`adapter.css` starts with the order statement and its three imports, then fills the boundary with a single declaration. Inside pragma's territory every property Vanilla set is reverted to the browser default, and pragma's layers, all of them higher, apply on top exactly as they would on a pragma-only page:

```css
@import url("@canonical/styles/tokens.css");
@import url("@canonical/styles/layout.css");
@import url("./elements.css");

/* abridged: the shipped file lists every WebKit form part Vanilla styles,
   then each Gecko form part in a rule of its own */
@layer boundary {
  :where(.ds, .ds *):where(:not(svg, svg *), svg a),
  :where(.ds, .ds *):where(:not(svg, svg *), svg a)::before,
  :where(.ds, .ds *):where(:not(svg, svg *), svg a)::after,
  :where(.ds, .ds *)::placeholder {
    all: revert;
  }
}
```

### The second boundary, and why it is below Vanilla

`all: revert` cannot touch an `!important` declaration. For important rules the cascade reverses the layer order: the declaration in the *first* layer wins, and an unlayered important loses to every layered one. So an important revert written into `boundary` loses to Vanilla's own, which we measured — a list under `.u-text-max-width` kept its `max-width: 40em`.

The counter has to sit below Vanilla, and a sublayer of `vanilla` is where it belongs. A rule written directly into a layer lands in that layer's implicit final sublayer, which sorts after every named sublayer, so `vanilla.escapes` beats the consumer's own `@layer vanilla { … }` block whichever order the two sheets arrive in. We measured both orders.

Six Vanilla rules need it: every important declaration in the compiled build whose subject compound carries no class, so an element inside an island matches it while the Vanilla class sits on an ancestor outside — the arrangement the rules recommend. The set is identical in 4.56 and 4.58. Each counter mirrors Vanilla's own selector and adds the island requirement, so it fires only where the leak is.

It is not free. Inside those four Vanilla utilities the important revert also outranks pragma's own declaration of that one property: a pragma list inside `.u-text-max-width` gets the browser's `max-width` rather than pragma's. Narrowing further is not possible — excluding pragma's own elements hands them straight back to Vanilla, which is the worse half of the trade. The README names the cost.

Pseudo-elements are separate boxes with their own cascade and cannot be named inside `:where()`, so each one that Vanilla styles without a class needs its own selector. The Gecko ones sit in rules of their own, because a selector list naming a `-moz-` pseudo-element is dropped whole by other engines. Inline SVG is excluded from the boundary because `revert` also rolls back presentational attributes, which SVG draws with; the one Vanilla rule that would otherwise reach in, its bare `a` colour, is handled by keeping SVG anchors inside the boundary.

The mode bridge lives in the same file. Pragma resolves every colour against `color-scheme`, while Vanilla carries light or dark on two inherited custom properties that its `.is-light`, `.is-paper`, `.is-dark` and dark strips all set. At each outermost pragma root, the nearest Vanilla mode ancestor decides, through inheritance:

```css
@layer ds.adapter {
  :where(.ds:not(.ds *)) {
    color-scheme: var(--vf-theme-light, light) var(--vf-theme-dark, dark);
  }
}
```

Under a light or paper ancestor that computes to `light`, under a dark ancestor to `dark`, and where no Vanilla mode is set at all to `light dark`, which is pragma's own default.

## The confined copy

Pragma's stylesheet is an ordinary one, and it ships as three entry points. `tokens.css` holds the values, `layout.css` the layout presets, and `elements.css` the three element layers: `normalize` (pragma's reset), `ds.reset` (the page's baseline of font, colour, line height, weight, text wrapping and box sizing) and `ds.typography` (the typography package's element rules and its baseline engine). Those style the whole document, which is right on a pragma-only page.

A mixed page needs the same rules to reach only pragma's components. That is what this package's `elements.css` is: the same rules, declaration for declaration, wrapped in `@scope (.ds)` and re-addressed to a component root. The two files share a name because they are the same thing seen from two sides, one addressed to the page and one to an island, and `adapter.css` loads this one alongside pragma's other two entries.

The copy differs from the original only in its selectors:

- The document element, `html` or `:where(html)`, becomes the outermost pragma root, `:where(:scope:not(.ds *))`, keeping any `:not()` list it carried.
- `body { margin: 0 }` becomes `:where(:scope:is(body))`. The body's margin is zeroed only when the body itself is a pragma root, because the margin of an element the host page owns is not this package's decision. Anything else the body declares, such as the base font from the typography rules, lands on the pragma root.
- A list of controls, `button, input, optgroup, select, textarea` and the button and search types, becomes `:where(:scope, :scope *):is(…)`, so that a control which is itself a pragma root is reached.
- The universal box-sizing rule, `*, ::before, ::after`, is written outside the scope block as `:where(.ds, .ds *)` and its two pseudo-elements. That one is measured: it is the only rule with universal reach, and inside a scope block it cost about 135 ms of a 200 ms style-recalculation regression on a page of 10,000 elements.
- A class that a pragma root can carry, such as `.p` on a field error, `.code` on an inline code span or `.editorial` on a flipped region, is written twice, once bare and once as `:scope.p`.
- Everything else is unchanged.

What is not copied lives in `tokens.css`: the naming shims, the typographic scale, and the baseline grid unit, which the typography package declares once at zero weight so the element rules and the engine can read it plainly. Those are custom properties on the page's root, and a pragma component inherits them, so nothing else needs to travel. The copy carries the engine that pragma's `elements.css` names, the cap-unit one; if a page links a different engine itself, that engine is not confined.

`tests/elements.test.ts` keeps the copy honest. It runs under `bun run test` and needs no browser.

It reads two things and compares them. On pragma's side it takes everything `packages/styles/main/src/elements.css` composes, following its imports through `normalize.css`, `reset.css`, the typography package's `elements.css` and the engine that entry names. On this side it takes `elements.css`.

It then strips the comments, walks the rules of both, and asks four questions. Are the layer names and their order the same? Does every rule on pragma's side have exactly one counterpart here? Does that counterpart carry the same declarations, in the same order, in the same position within its layer, under the same `@media` or `@supports` condition? And is its selector the mapping above, applied to the original?

It also checks the other side of the split: that every entry point opens with pragma's thirteen-name statement, that `tokens.css` and `layout.css` bring no element rule with them, and that `tokens.css` carries the typographic scale.

When pragma changes one of those files the test fails and names the rule that moved. Bring the copy up to date, apply the mapping, and run it again. Where a rule exists on one side only, the test lists it with the reason, and fails if that reason goes stale.

## Selectors

Two pieces of CSS carry the copy, and both are worth understanding rather than copying.

`:where()` keeps whatever is inside it at zero specificity. That is why the copy's root rule weighs what pragma's `:where(html)` rule weighed, and why the whole reset loses to any single class in any layer above it. These are defaults, and a component or a modifier should be able to override one without escalating.

`:scope` inside a `@scope` block means the scoping root, the element that matched the prelude. It is the only way a rule inside the block can reach that element, because a selector written there is relative to the root and looks below it:

```css
@scope (.ds) {
  p { … }       /* a paragraph inside a pragma component, not the component itself */
  :scope { … }  /* the component root */
}
```

A `<p class="ds field-error p">` nested inside another pragma component is matched by the plain `p` rule through the component around it. Only one that is itself the outermost root is not, because no block contains it, and `:scope.p` exists for that case.

### The `ds` class

`ds` sits on every pragma component root, as in `<button class="ds button">`, and the component's rules are written `.ds.button`.

Its first job is to be a namespace. Pragma's rules cannot match a host element that happens to carry `button`, every component rule starts at the same weight, and the shape is the one Semantic UI used (`ui button`). The namespace also makes the direct-child combinator usable at scale: a component's parts are addressed one level down from its root, as in `.ds.button > .icon` or `.ds.card > .card-header`, so a component nested inside another never picks up the outer component's part rules, and a stylesheet grows with the number of parts rather than with the depth of nesting. A prefix scheme such as `ds-button > .icon` would give the same.

Its second job is to mark pragma's territory, and that is the one a prefix could not do. The same class is what this package selects on, in `@scope (.ds)` in `elements.css` and in `:where(.ds, .ds *)` in `adapter.css` and the box-sizing rule. There is no way to say "any pragma element" with a prefix scheme, which is why the compound class is load-bearing here.

The weight of that class is deliberate in both jobs. As a namespace it weighs one class, and this package does not touch the component stylesheets: `.ds.button` stays at two classes, with no `:where()` and no `@scope`, and between layers the layer decides before specificity is read. As a territory marker it weighs nothing, because the element layers in the copy are defaults that must lose to everything, and inside those layers source order decides. The copy's rules land at or just below the weight of pragma's originals: `:where(:scope:not(.ds *))` is zero where `html` was one element, and `:where(:scope, :scope *):is(button)` is one element, as `button` was. The known cost of the compound is that a component rule which must beat its own base rule does so by order or by a third class, never by an ancestor prefix.

### Selector patterns in `elements.css`

`:where(:scope:not(.ds *))` addresses the outermost pragma root only. Every component is a scoping root, so a bare `:scope` would put the baseline on all of them:

```css
:where(:scope:not(.ds *)) { font-family: var(--typography-text-primary-font-family); }
```

`:where(:scope, :scope *):is(button, input, …)` reaches a control that is itself a pragma root, which a scoped selector alone never matches:

```css
:where(:scope, :scope *):is(button, input, optgroup, select, textarea) { margin: 0; }
```

The universal box-sizing rule sits outside the block, for the recalculation cost described above:

```css
:where(.ds, .ds *), :where(.ds, .ds *)::before, :where(.ds, .ds *)::after { box-sizing: border-box; }
```

And `.p, :scope.p` covers an engine class on a root, for the same reason as the control rule:

```css
p, .p, :scope.p { margin-block: 0; }
```

### `@scope` against a prefix

The rule bodies and the element selectors stay identical to pragma's source, so the copy is one wrapper per layer plus the four patterns above, and the mapping the test applies stays small. There is one thing to forget per file rather than one per rule, the root has a name, and no weight is added without wrapping.

The costs are worth stating. There is a browser floor of Chrome 118, Safari 17.4 and Firefox 146, below which a browser drops the whole block. A scoping root is not inside its own block, which is what forces the patterns above. And a universal selector inside a block is expensive, which is why one rule sits outside. The choice belongs to this package alone: the copy could switch to the `:where(.ds)` prefix form, with its mapping, without touching pragma.

