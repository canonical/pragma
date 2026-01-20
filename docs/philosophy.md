# Philosophy

This document describes the principles that guide decisions in Pragma. These principles emerged from building and maintaining design systems at Canonical, and each one addresses a specific category of problem that we have encountered repeatedly.

The principles are not aspirational statements about what good software should be. They are practical constraints that shape how we write code, structure packages, and make trade-offs. When two valid approaches exist, these principles determine which one we choose.

---

## I. No Magic

Software becomes difficult to maintain when its behaviour cannot be understood by reading the code. Frameworks often hide complexity behind conventions that feel productive until something breaks, at which point developers must reverse-engineer the hidden behaviour to diagnose the problem.

Pragma rejects this trade-off. Every import is explicit, so you can trace where a component comes from by following the import statements. Every export is listed in a barrel file, so the public API of a module is visible without running any tools. Configuration files are plain JSON that you can read and understand without consulting framework documentation.

This principle has concrete implications for how we write code. When the Button component needs its styles, it imports `./styles.css` directly rather than relying on a build tool to discover and inject stylesheets based on naming conventions. When a package depends on another package, that dependency appears in `package.json` rather than being resolved through workspace hoisting magic.

The same reasoning drives our choice of pure CSS over CSS-in-JS or preprocessors. Sass, Less, and styled-components all introduce abstraction layers that transform what you write into something different from what ships. Pure CSS means the stylesheet you read in the source is the stylesheet that runs in the browser. CSS custom properties provide the theming and composition capabilities that preprocessor variables once required, without a compilation step that hides the transformation.

The cost of explicitness is verbosity. We accept this cost because explicit code can be understood by anyone reading it for the first time, debugged with standard tools, and refactored with confidence that nothing hidden will break.

---

## II. Explicit Conventions

Conventions reduce cognitive load by making codebases predictable. A developer who understands how one component is structured can navigate any component in the system. A CI script that works for one package works for all packages.

However, conventions become problematic when they are enforced through runtime magic rather than documented patterns. Rails-style conventions where placing a file in a specific directory automatically registers it as a route or controller feel productive, but they couple your code to framework-specific behaviour that is invisible in the source.

Pragma uses conventions extensively, but they are explicit conventions that humans follow rather than implicit conventions that frameworks enforce. Every component folder contains the same files in the same structure because developers create those files following a documented pattern, not because a framework scans directories at runtime. Every package has the same npm scripts because developers copy from a template and modify as needed, not because a meta-framework generates them.

The generator tool (`@canonical/generator-ds`) scaffolds new components following our conventions, but the generated code is ordinary code with no special relationship to the generator. You can modify any generated file without breaking anything, and you can create components manually without using the generator at all.

This approach means conventions are discoverable by reading the code. If you want to understand how components are structured, you can open any component folder and examine its contents. The structure is documented in the code standards ontology, but the code itself is the authoritative source.

---

## III. DRY Only for Stable Patterns

The principle of Don't Repeat Yourself encourages extracting common code into shared abstractions. This advice is sound when the pattern being extracted is stable and well-understood, but it causes problems when applied prematurely.

Premature abstraction creates coupling between components that may evolve in different directions. When you extract a shared function from two components, those components now depend on the shared function. If one component later needs different behaviour, you face a choice between complicating the shared function with conditionals, or duplicating the function and diverging the implementations.

Pragma treats duplication as a tool rather than a problem to eliminate. When implementing a new feature, we allow duplication during exploration because duplicated code can evolve independently. Once a pattern has proven stable across three or more use cases, we consider extracting it to a shared location.

The `@canonical/utils` package contains only functions that have demonstrated value across multiple packages. Functions enter this package after proving themselves, not in anticipation of future reuse. If a utility function exists in only one package, it remains in that package even if it seems generally useful.

This principle applies to components as well. The decision to promote a pattern from a specific package to the global tier happens after observing the pattern working successfully in multiple contexts, not when someone predicts that a pattern will be useful.

---

## IV. No Premature Optimisation

Performance optimisation involves trade-offs. Optimised code is often more complex, harder to understand, and more difficult to modify than straightforward code. These costs are justified when the code is actually a performance bottleneck, but they are pure overhead when applied speculatively.

Pragma prioritises clarity over performance in the absence of evidence. When implementing a feature, we write the straightforward version first. This code is easy to understand, easy to test, and easy to modify. If profiling later reveals a performance problem, we have a clear baseline to optimise against and can measure whether our optimisations actually help.

This principle does not mean ignoring performance entirely. It means deferring performance work until we have data. Choosing an O(n) algorithm over an O(n²) algorithm when the difference is obvious requires no measurement. But restructuring code to avoid a closure allocation or inlining a function to reduce call overhead requires evidence that these micro-optimisations matter for actual workloads.

The React components in Pragma are not aggressively memoised by default. Memoisation adds complexity and can actually hurt performance when the comparison cost exceeds the render cost. Components receive memoisation when profiling demonstrates a specific performance problem, not as a default defensive measure.

---

## V. Modern Stack, No Legacy Burden

Supporting old platforms has compounding costs. Each legacy platform requires testing, documentation, and maintenance. Polyfills increase bundle size. Avoiding modern APIs constrains how code can be written. The testing matrix grows with each platform combination.

Pragma targets current platforms: Node 22 or later, Bun 1.3 or later, React 19 or later, TypeScript 5.9 or later. We use ES modules exclusively; CommonJS is not supported. Browser support follows the defaults established by the consuming applications, which target modern evergreen browsers.

This constraint enables cleaner code. Components can use React 19 features without compatibility shims. Build configuration uses native ESM without dual-package complexity. TypeScript can use the latest language features and strictness options without worrying about downstream compatibility.

When Node or React release new major versions, Pragma updates its minimum requirements promptly. We do not maintain long support windows for deprecated runtimes. Applications that cannot upgrade their platform versions should pin their Pragma version rather than expecting Pragma to maintain backward compatibility indefinitely.

---

## VI. Explicit Types, Explicit Exports

TypeScript provides the most value when types are explicit rather than inferred. Inferred types work well within a function, but at module boundaries they create coupling between implementation details and public API. A change to internal code can inadvertently change the inferred type signature, breaking consumers.

Pragma requires explicit type annotations at module boundaries. Props interfaces are defined in dedicated `types.ts` files with TSDoc comments explaining each property. Function return types are explicit. Barrel exports use `export type` for type-only exports to make the distinction clear.

This explicitness serves documentation as well as type safety. The types file for a component describes its public API without requiring readers to examine the implementation. The TSDoc comments appear in IDE tooltips and generated documentation. The explicit export list in `index.ts` shows exactly what the module exposes.

The cost is writing more type annotations than TypeScript strictly requires. We accept this cost because explicit types make the codebase easier to navigate, easier to document, and more resilient to accidental API changes.

---

## VII. Composition Over Inheritance

Class inheritance creates tight coupling between parent and child classes. Changes to a parent class affect all children, and the inheritance hierarchy becomes load-bearing structure that is difficult to refactor. Deeply nested inheritance hierarchies are particularly problematic because behaviour is distributed across many files.

Pragma uses composition instead of inheritance. Components are small functions that render other components. Shared behaviour lives in hooks that components can call. Complex components are built by composing simpler components, with the composition visible in the render function.

The Card component illustrates this approach. Rather than inheriting from a base component, Card exposes subcomponents as static properties: `Card.Section`, `Card.Image`, `Card.ThumbnailSection`. Consumers compose these pieces to build the card they need:

```tsx
<Card emphasis="highlighted">
  <Card.Image src={thumbnail} alt={title} />
  <Card.Section>
    <h3>{title}</h3>
    <p>{description}</p>
  </Card.Section>
</Card>
```

This pattern keeps components focused and independently testable. Each subcomponent has its own folder with its own tests. The parent component coordinates the subcomponents but does not contain their logic.

---

## Summary

These principles form a coherent approach to building maintainable software. Explicitness enables understanding. Conventions enable predictability. Restraint with abstraction enables evolution. Clarity enables optimisation when needed. Modern platforms enable clean code. Types enable documentation. Composition enables flexibility.

The principles sometimes tension with each other. Explicitness can conflict with DRY when extracting repeated code would hide the explicit structure. Conventions can conflict with no-magic when enforcing conventions automatically. In these cases, we resolve the tension by preferring the principle that keeps behaviour visible and code understandable.

Pragma is opinionated software. These opinions have served us well, and we expect them to serve you well too if you share our values around explicit, maintainable code.
