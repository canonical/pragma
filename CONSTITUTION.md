# Constitution

Twelve principles govern how pragma is built. Each principle is a constraint that resolves a recurring category of decision---when two valid approaches exist, these principles determine which one wins.

The principles are not aspirational. They are operational. Code that violates a principle is a bug, not a style choice.

---

## I. Universal human interface design

A design system exists to serve people, and the people who use software built with it have different preferences, abilities, languages, cultures, input devices, and contexts. Universal design means the system accounts for this diversity by default, not as an afterthought.

Accessibility is structural, not decorative. Components meet WCAG 2.2 AA as a baseline. ARIA attributes, keyboard navigation, focus management, and screen reader compatibility are part of the component contract---they appear in the type definitions, they are covered by tests, and they are validated in CI. A component that renders correctly but is not operable by keyboard is incomplete.

The system adapts to the user, not the other way around. When a user declares a preference---reduced motion, high contrast, a specific colour scheme, forced colours---the system honours it without requiring the application to opt in. These preferences are not progressive enhancements. They are constraints on every component that animates, uses colour, or relies on contrast to convey meaning. The architecture must make honouring them the path of least resistance, so that a contributor who does nothing special still produces output that respects user preferences.

The cost is more testing, more design cases, and constraints on visual creativity. The benefit is software that works for the widest possible range of people, not just for the people who happen to resemble the developers who built it.

---

## II. Domain-driven design

The system is organised around domains, not around technical layers. A domain is a bounded context with its own language, its own rules, and its own boundaries. Code lives where its domain lives, and cross-domain dependencies flow in one direction: higher-level domains depend on lower-level ones, never the reverse.

Domain boundaries are made real through seams---the explicit surfaces where one part of the system meets another. A seam is a module boundary, a package boundary, or a layer transition. Every seam has a contract that defines what crosses it and what does not. What a seam exports is public API. What it does not export is implementation detail. Adding or removing an export is a design decision, not a housekeeping task.

Naming follows from this structure. When a file's location already establishes its context, the filename carries only the role. The directory path provides the specificity; the filename stays generic. Redundancy in names is a signal that the structure is not carrying its weight.

The cost is more packages, more explicit wiring, and more deliberate boundary management than a flat or layer-based approach. The benefit is that each domain can evolve, be tested, and be understood independently, and a contributor can understand any module's contract by reading its seam without tracing through the implementation.

---

## III. Semantics first

The vocabulary a system uses to describe itself shapes how its contributors think about it. This is not a metaphor---it is the linguistic relativity of software. A codebase that names things for what they look like trains its contributors to think in visual patches. A codebase that names things for what they mean trains its contributors to think in intent. pragma chooses meaning.

The distinction matters because appearance changes and intent does not. A visual name binds to a specific rendering: when the rendering changes, the name must change with it or become a lie. A semantic name binds to the reason the thing exists, which survives redesigns, theme switches, and platform shifts. Every naming decision in the system---modifiers, class names, markup elements---follows from this: name the invariant, not the variant.

Modifiers express what a component *is for*, not what it *looks like*. The visual treatment is a consequence, resolved downstream through the token chain, and it can change without changing the modifier. Class names follow the same rule: utility classes that encode specific CSS properties or pixel values are not used, because they scatter layout decisions across markup and name effects rather than properties. Spacing, layout, and typography live in stylesheets or resolve through tokens---always as part of a system, never as ad-hoc overrides. Markup is semantic too: components render the element that matches their role, not a generic container with ARIA retrofitted, because structure carries meaning to screen readers, search engines, and future developers before they ever read the styles.

The cost is slower initial development. Naming things for what they mean requires understanding what they mean, which takes longer than naming them for what they look like. The benefit is a vocabulary that survives visual redesigns, theme changes, and platform shifts, because the names describe the invariant---the intent---not the variant---the appearance.

---

## IV. Functional core

The system draws heavily from functional programming---not out of allegiance to a paradigm, but because pure functions, immutable data, and effect isolation happen to produce code that is easier to test, easier to reason about, and easier to compose.

Components are pure functions of their inputs: given the same inputs, a component produces the same output. Side effects are isolated at the boundary, separated from the core logic so that the core can be tested and composed without executing effects.

Data structures are preferred over stateful objects. Configuration is plain data, not class instances with lifecycle methods. Transformations are functions that take data and return data, and pipelines are compositions of these functions.

Not every function must be pure. State exists. IO happens. The principle is about default posture: start with pure functions, add effects only where the problem requires them, and keep the effectful boundary as thin as possible.

The cost is a steeper onboarding curve for developers whose instinct is to reach for mutation and imperative control flow. Patterns like effect description separated from effect execution, or data pipelines instead of stateful orchestrators, require a mental model shift that does not happen in an afternoon. The benefit compounds over time: pure functions are trivially testable, safely composable, and immune to the action-at-a-distance bugs that plague stateful systems.

---

## V. Composability

Software that is built by composing small, focused pieces is easier to understand, test, and extend than software that is built by configuring large, general-purpose ones. Inheritance hierarchies resist change because behaviour is distributed across a class tree. Configuration-heavy systems resist understanding because the relationship between input and output is mediated by layers of option-merging logic. Composition avoids both: the pieces are visible, the wiring is explicit, and the result is a direct consequence of how the pieces are assembled.

**Component composition.** Components are small functions that render other components. Shared behaviour lives in hooks. Complex components expose subcomponents as named properties rather than inheriting from base classes---consumers compose the pieces they need:

```tsx
<Card emphasis="highlighted">
  <Card.Image src={thumbnail} alt={title} />
  <Card.Section>
    <h3>{title}</h3>
    <p>{description}</p>
  </Card.Section>
</Card>
```

Each subcomponent has its own directory with its own tests. The parent coordinates but does not contain their logic.

**Scope composition.** Packages are organised in tiers where each tier extends the one above. A consumer imports from the most specific tier that matches their needs and receives the full scope through a single package. Tiers compose upward: a higher tier re-exports the lower tier's barrel, so one import grants access to the entire tree beneath it.

**Token composition.** Design tokens flow through layers, each composing the one below. A component never references a raw value directly---it references a variable that resolves through successive layers of semantic abstraction. Theming, contextual overrides, and visual depth compose through the cascade without imperative intervention.

**Modifier composition.** Modifiers express semantic intent through orthogonal axes. A single ancestor class shifts the visual output of every descendant, and multiple modifier contexts resolve simultaneously through the cascade. No prop drilling, no context providers for visual state.

The cost is more pieces, more files, and a steeper initial learning curve for developers accustomed to monolithic components or configuration-driven frameworks. The benefit is that each piece is independently testable, independently replaceable, and independently comprehensible.

---

## VI. No magic

Software becomes difficult to maintain when its behaviour cannot be understood by reading the source. Frameworks routinely hide complexity behind conventions that feel productive until something breaks, at which point the developer must reverse-engineer hidden behaviour to diagnose the problem. This trade-off---convenience now, opacity later---is rejected.

Every import is explicit. Every export is listed in a barrel file. Configuration files are plain data. The behaviour of the system is visible in the source, with no conventions that require framework knowledge to interpret and no build-time transforms that alter what ships. A component imports its stylesheet directly rather than relying on a build tool to discover and inject it by naming convention. Package dependencies appear in the manifest rather than being resolved through workspace hoisting.

The choice of pure CSS over CSS-in-JS or preprocessors follows from the same reasoning. Preprocessors and CSS-in-JS libraries introduce a transformation layer between authoring and execution---what the developer writes is not what the browser runs. Pure CSS eliminates this gap. The stylesheet in the source is the stylesheet in the browser. CSS custom properties provide the theming and composition capabilities that preprocessors once required, without a compilation step that obscures the relationship between input and output.

The cost is verbosity. Explicit code requires more characters, more files, and more deliberate wiring than code that relies on inference and convention. The benefit is that any developer can understand the system by reading it, debug it with standard tools, and refactor it with confidence that nothing hidden will break.

---

## VII. Explicit conventions

Conventions exist to make codebases predictable. When every component follows the same structure, understanding one teaches you how to navigate all of them. When every package exposes the same scripts, a CI pipeline that works for one works for all. Predictability reduces the cognitive overhead of moving between parts of the system and lowers the barrier for new contributors.

The danger arises when conventions are enforced through runtime magic rather than documented patterns. Framework-style conventions---where placing a file in a specific directory automatically registers it as a route, or naming a function according to a pattern gives it lifecycle behaviour---feel productive but create invisible coupling between code and framework internals. When these conventions break, the developer has no source to read, only framework documentation to consult.

The system uses conventions extensively, but they are explicit: humans follow them because the patterns are documented and the structure is visible, not because a framework scans directories or infers intent from filenames. Generators scaffold new components following these conventions, but the generated code is ordinary code with no privileged relationship to the generator. Any generated file can be modified without consequence, and components can be created manually without using the generator at all.

The code itself is the authoritative source of what the conventions are.

---

## VIII. DRY only for stable patterns

The instinct to eliminate duplication is strong, and in many contexts it serves well. But premature abstraction---extracting a shared function from two consumers before the pattern has stabilised---creates a different kind of problem. Both consumers now depend on the shared function, and if one later needs different behaviour, the choice is between complicating the abstraction with conditionals or duplicating it and diverging. The abstraction that was supposed to reduce complexity has become the source of it.

Duplication is treated as a tool rather than a problem. During exploration, duplicated code can evolve independently, and each copy can adapt to its context without negotiating with other consumers. Once a pattern has proven stable across three or more use cases, extraction to a shared location is warranted---but the threshold is deliberate. Shared packages contain only what has demonstrated value through actual reuse, not what someone anticipates might be useful. A utility that exists in only one package remains there, even if it appears generally applicable.

The same applies to component promotion. Moving a pattern from a specific scope to a shared scope happens after observing it working in multiple contexts, not when someone predicts it will be useful. The prediction is almost always premature, and the coupling it creates outlasts the convenience it provides.

---

## IX. No premature optimisation

A design system tempts optimisation at every level---memoising components, inlining styles, flattening data structures, caching token lookups. Each optimisation adds complexity that must be understood, maintained, and debugged. These costs are justified when the code is a measured bottleneck. They are pure overhead when applied speculatively.

Clarity comes first. The straightforward version of a feature is easy to understand, easy to test, and easy to modify. If profiling reveals a performance problem, a clear baseline exists to optimise against. The burden of proof is on the optimisation, not on clarity.

The same discipline applies to rendering. Memoisation adds complexity and can hurt performance when the comparison cost exceeds the render cost. Components receive memoisation when profiling demonstrates a specific problem, not as a defensive default. The rule is simple: measure first, optimise second, and keep the unoptimised version readable enough that a future contributor can understand what was traded away.

---

## X. Modern stack, no legacy burden

Supporting old platforms has compounding costs: testing, documentation, maintenance, polyfills, restricted APIs, and expanding test matrices. Each legacy platform constrains how code can be written, and the constraints accumulate silently until the codebase is shaped more by what it cannot use than by what it needs.

The system targets current platforms and current language versions. ES modules exclusively---CommonJS is not supported. Browser support follows the defaults of consuming applications, which target modern evergreen browsers. This constraint enables cleaner code: components use current framework features without compatibility shims, build configuration avoids dual-format complexity, and the language can use its latest features and strictness options.

When runtimes or languages release new major versions, minimum requirements update promptly. Long support windows for deprecated runtimes are not maintained. Consumers that cannot upgrade should pin their version.

As adoption grows and external teams depend on the system in production, this posture will evolve. Backward compatibility commitments---deprecation windows, migration guides, semver discipline---will scale with the number of consumers. The principle remains: no legacy burden that compounds silently. The mechanism for honouring it changes as the system matures.

---

## XI. Structured data over prose

Prose documentation is valuable for human readers but opaque to tooling. When specifications exist only as paragraphs in markdown files, tools cannot query them, validate against them, or generate code from them. The knowledge is locked in a format that requires human interpretation, and as the system grows, the cost of that interpretation compounds: more entities, more relationships, more implicit rules that prose captures ambiguously if it captures them at all.

Specifications that are precise enough for machines to reason about are precise enough for humans to trust. Where a specification needs to be queried, validated, or used to generate code, it is expressed as structured data---formal ontologies, schema-based rulesets, typed definitions---not as prose that a reader must interpret and a contributor must remember to keep consistent.

The principle does not mean abandoning prose. Human-readable documentation remains essential for rationale, examples, and onboarding. Prose and structured data serve complementary purposes---one optimised for human comprehension, the other for machine reasoning---and reinforce rather than compete with each other.

The cost is additional tooling and a steeper learning curve for contributors unfamiliar with semantic technologies. Structured specifications eliminate ambiguity, enable automation, and make the system navigable by both humans and machines.

---

## XII. Predictable execution

Every build, check, and test command produces the same result regardless of who runs it, when, or where. Deterministic execution is not a convenience---it is a prerequisite for trust in the system.

The check suite---linting, type-checking, formatting, architecture validation, and tests---runs in CI on every pull request across multiple runtime versions, because a build that passes on one runtime and fails on another is not deterministic. Architecture validation confirms that every required file, export, dependency, and script is present. A package that passes validation conforms to the architecture. A package that fails does not ship.

Coverage thresholds enforce test discipline. Parity tests block merges if different surfaces of the same data disagree. These are not aspirational targets---they are automated constraints that prevent drift from becoming debt.

The cost is friction. Checks slow merges. Validation rejects valid-looking packages that miss a required field. This friction is the mechanism by which the system maintains its own integrity over time.

---

## Summary

These twelve principles form a coherent approach to building maintainable software:

- Universal design enables inclusion.
- Domains enable boundaries.
- Semantics enable longevity.
- Pure functions enable reasoning.
- Composability enables flexibility.
- Explicitness enables understanding.
- Conventions enable predictability.
- Restraint with abstraction enables evolution.
- Clarity enables optimisation when needed.
- Modern platforms enable clean code.
- Structured data enables automation.
- Predictable execution enables trust.

The principles sometimes tension with each other. Explicitness can conflict with DRY when extracting repeated code would hide the explicit structure. Conventions can conflict with no-magic when enforcing conventions automatically. Universal design can conflict with no premature optimisation when accessibility work addresses needs that have not yet been measured as bottlenecks---but accessibility is not an optimisation, it is a baseline, and the tension resolves in favour of inclusion. Modern stack can conflict with universal design when dropping an old platform drops the users still on it---the mitigation is version pinning, not indefinite support, but the tension is real and should be felt. In all cases, the tension resolves by preferring the principle that keeps the system honest: visible behaviour, verifiable claims, and no silent compromises.
