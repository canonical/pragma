/**
 * The stylesheets under test, and the README that documents them.
 *
 * Everything here runs in the browser, and every question the cascade can answer
 * is asked of the CSSOM. `@layer`, `@scope` and `!important` are cascade
 * structure, and an engine that implements the cascade is the only parser that
 * reports what a browser will do with them: a regular expression finds what was
 * typed, which is a different question and, for importance, a different answer —
 * a browser reads `!IMPORTANT`, and a comment between the bang and the word, as
 * important, and neither is the literal string a search would look for.
 *
 * Four questions are left to the text, and each is a question about the text.
 * Which files a stylesheet imports: `replaceSync` drops `@import` rules from a
 * constructed stylesheet altogether. Where an `@import` sits relative to the
 * rules: a browser drops a late one outright, so it is missing from the CSSOM
 * exactly when it is a defect, and a bundler inlines it, so the resolved text
 * hides it too — that check reads the unresolved file. How many `@property`
 * registrations a file writes, which is the number the CSSOM's count is compared
 * against, and which only the source can say, because a rejected registration
 * leaves nothing behind. And a scan for `!important` in each file as source
 * hygiene, which reaches files the entry never imports and so never parses; the
 * live guarantee is the CSSOM's, next to it.
 *
 * Nothing is transformed. Vite resolves the `@import` graph the way a consumer's
 * bundler resolves it, `?inline` hands the resolved text to the test, and `?raw`
 * hands over a single file unresolved.
 */

import anticipationCss from "@canonical/design-tokens/dist/modifiers.anticipation.css?inline";
import criticalityCss from "@canonical/design-tokens/dist/modifiers.criticality.css?inline";
import emphasisCss from "@canonical/design-tokens/dist/modifiers.emphasis.css?inline";
import importanceCss from "@canonical/design-tokens/dist/modifiers.importance.css?inline";
import surfacesCss from "@canonical/design-tokens/dist/modifiers.surfaces.css?inline";
import themeCss from "@canonical/design-tokens/dist/modifiers.theme.css?inline";
import typographyTokensCss from "@canonical/design-tokens/dist/modifiers.typography.css?inline";
import primitiveCss from "@canonical/design-tokens/dist/sets.primitive.css?inline";
import statesCss from "@canonical/design-tokens/dist/states.css?inline";
import typographyCss from "@canonical/styles-typography?inline";
import readme from "../../README.md?raw";
import entryCss from "../../src/index.css?inline";
import entryRaw from "../../src/index.css?raw";

export { entryCss, entryRaw, importanceCss, readme, typographyCss };

/** The layers the entry's statement names, in order. Nothing else may be opened. */
export const DECLARED_LAYERS = [
  "normalize",
  "ds.tokens",
  "ds.reset",
  "ds.typography",
  "ds.modifiers",
  "ds.surfaces",
  "ds.states",
  "ds.components",
  "ds.components.global",
  "ds.components.app",
];

/**
 * The layers whose rules select elements, and which are therefore confined to
 * pragma territory. Every style rule in one of them must sit inside a
 * `@scope (.ds)` block, so that it reaches the marked subtree and nowhere else:
 * a rule of theirs escaping into a page pragma does not own is the defect this
 * whole release exists to close.
 */
export const ELEMENT_LAYERS = [
  "normalize",
  "ds.reset",
  "ds.typography",
  "ds.components.global",
];

/**
 * The one rule in an element-level layer written outside a `@scope` block, and
 * why. It has universal reach, so every element in the tree would pay a
 * scope-activation check for it; measured on a 10,000-element page that cost
 * about 135 ms of a 200 ms style-recalc regression. `:where(.ds, .ds *)` confines
 * it exactly as the scope would — same match set, same specificity, same layer.
 * Its own README row says so, and this is that row's check.
 */
export const UNSCOPED_BY_MEASUREMENT = [
  "ds.reset :where(.ds, .ds *), :where(.ds, .ds *)::before, :where(.ds, .ds *)::after",
];

/**
 * The layer the statement declares that nothing yet writes to: the application
 * tiers move into it when their stylesheets are wrapped. Naming it here rather
 * than at first appearance is what fixes its order, so it has to be declared
 * before anything writes to it.
 */
export const RESERVED_LAYERS = ["ds.components.app"];

/**
 * The one layer nothing may ever write to directly. A rule written straight into
 * a parent layer lands in that layer's implicit final sublayer, which sits above
 * every named sublayer — so such a rule would outrank both component tiers and
 * no component package could override it by layer at all.
 */
export const TIERS_ONLY_LAYER = "ds.components";

/** The layer names the `@canonical/design-tokens` plugin emits (its README's row). */
export const TOKEN_PLUGIN_LAYERS = {
  "sets.primitive": "ds.tokens",
  "modifiers.theme": "ds.modifiers",
  "modifiers.surfaces": "ds.surfaces",
  states: "ds.states",
};

const byBasename = (
  modules: Record<string, string>,
  prefix: string,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(modules).map(([path, css]) => [
      path.replace(prefix, ""),
      css,
    ]),
  );

/**
 * Every file the package's own `src/` holds, resolved. The glob is what makes a
 * new stylesheet fail the tables below: a file nobody documented still turns up
 * here, and a file the README names that no longer exists resolves to nothing.
 */
export const LOCAL_SOURCES: Record<string, string> = byBasename(
  import.meta.glob<string>("../../src/*.css", {
    eager: true,
    import: "default",
    query: "?inline",
  }),
  "../../src/",
);

/** The same files unresolved, for the questions above that are about the text. */
export const LOCAL_RAW: Record<string, string> = byBasename(
  import.meta.glob<string>("../../src/*.css", {
    eager: true,
    import: "default",
    query: "?raw",
  }),
  "../../src/",
);

/**
 * The typography package's baseline files, each resolved on its own. The package
 * entry imports one engine; the other two are documented as consumer-swappable
 * entry points and reach a page only when a consumer imports them directly, so
 * nothing would check them unless they are resolved alone. The shim is in the
 * glob because the engines import it, and is separated out below.
 */
const baselineSources: Record<string, string> = byBasename(
  import.meta.glob<string>("../../../typography/src/baseline-*.css", {
    eager: true,
    import: "default",
    query: "?inline",
  }),
  "../../../typography/src/",
);

/**
 * Every stylesheet the typography package writes, unresolved. The entry pulls
 * that package in, so a late `@import` written there reaches this stylesheet's
 * consumers exactly as one written here would — and the resolved text cannot
 * show it either, for the same reason.
 */
export const TYPOGRAPHY_RAW: Record<string, string> = byBasename(
  import.meta.glob<string>("../../../typography/src/*.css", {
    eager: true,
    import: "default",
    query: "?raw",
  }),
  "../../../typography/src/",
);

/** The registration the engines share; not an engine, and layered by nothing. */
export const BASELINE_SHIM = "baseline-shim.css";

/** The three interchangeable engines, resolved one at a time. */
export const ENGINE_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(baselineSources).filter(([name]) => name !== BASELINE_SHIM),
);

/**
 * The packages and generated files the README names, by specifier. A static map
 * is unavoidable — a bundler cannot resolve a specifier a test computes at run
 * time — so the test resolves every name the README uses through it, and a file
 * documented without a line here fails rather than passing unchecked. Two of
 * these the entry does not import: `modifiers.typography.css` reaches the page
 * through the typography package, and `modifiers.importance.css` is empty.
 */
export const EXTERNAL_SOURCES: Record<string, string> = {
  "@canonical/design-tokens/dist/modifiers.anticipation.css": anticipationCss,
  "@canonical/design-tokens/dist/modifiers.criticality.css": criticalityCss,
  "@canonical/design-tokens/dist/modifiers.emphasis.css": emphasisCss,
  "@canonical/design-tokens/dist/modifiers.importance.css": importanceCss,
  "@canonical/design-tokens/dist/modifiers.surfaces.css": surfacesCss,
  "@canonical/design-tokens/dist/modifiers.theme.css": themeCss,
  "@canonical/design-tokens/dist/modifiers.typography.css": typographyTokensCss,
  "@canonical/design-tokens/dist/sets.primitive.css": primitiveCss,
  "@canonical/design-tokens/dist/states.css": statesCss,
  "@canonical/styles-typography": typographyCss,
};

/** The resolved text of a file the README or the entry names, if it exists. */
export const sourceOf = (name: string): string | undefined =>
  EXTERNAL_SOURCES[name] ?? LOCAL_SOURCES[name.replace(/^\.\//, "")];

/** The same, for a name that must resolve: a README that names nothing fails here. */
export const mustResolve = (name: string): string => {
  const css = sourceOf(name);
  if (css === undefined)
    throw new Error(`"${name}" is named in the README and resolves to nothing`);
  return css;
};

/** A file name as the README writes it: a relative import loses its `./`. */
export const specifierName = (specifier: string): string =>
  specifier.replace(/^\.\//, "");

// ---------------------------------------------------------------------------
// The CSSOM
// ---------------------------------------------------------------------------

export const parse = (css: string): CSSStyleSheet => {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
};

/**
 * The child rules of any rule that has them: grouping rules, and style rules
 * with nested rules, which Chromium does not derive from CSSGroupingRule.
 */
const childRules = (rule: CSSRule): CSSRuleList | undefined =>
  "cssRules" in rule ? (rule as CSSGroupingRule).cssRules : undefined;

/** What the cascade knows about one style rule, wherever it is written. */
export interface StyleRuleFact {
  /** Its nearest enclosing layer, or `(unlayered)`. */
  layer: string;
  selector: string;
  /** Whether a `@scope (.ds)` block encloses it, at any depth. */
  confined: boolean;
  /** The longhands it declares, custom properties included. */
  properties: string[];
  /** Those of them the browser reads as important. */
  important: string[];
}

/**
 * Every style rule in a stylesheet, with the layer and the scope it sits in.
 * One walk answers four questions that would otherwise each need their own, and
 * all four are cascade questions: which layer a rule is in, whether it is
 * confined to pragma territory, what it declares, and what it declares
 * importantly. Importance comes from `getPropertyPriority`, which is what the
 * browser itself uses; `!IMPORTANT` and a comment between the bang and the word
 * are both important and neither is a literal `!important`.
 */
export const styleRules = (css: string): StyleRuleFact[] => {
  const found: StyleRuleFact[] = [];
  const walk = (rules: CSSRuleList, layer: string, confined: boolean): void => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerBlockRule) {
        walk(
          rule.cssRules,
          layer ? `${layer}.${rule.name}` : rule.name,
          confined,
        );
        continue;
      }
      if (rule instanceof CSSScopeRule) {
        walk(rule.cssRules, layer, confined || rule.start === ".ds");
        continue;
      }
      if (rule instanceof CSSStyleRule) {
        const properties = Array.from(rule.style);
        found.push({
          layer: layer || "(unlayered)",
          selector: rule.selectorText,
          confined,
          properties,
          important: properties.filter(
            (property) =>
              rule.style.getPropertyPriority(property) === "important",
          ),
        });
      }
      const children = childRules(rule);
      if (children) walk(children, layer, confined);
    }
  };
  walk(parse(css).cssRules, "", false);
  return found;
};

/**
 * Every layer a stylesheet opens with a block, at any depth, by its full name.
 * A block nested inside another inherits its parent's name as a prefix, which is
 * what `@layer a { @layer b { } }` means. An unnamed block is reported as
 * `(anonymous)`: it opens a layer nothing can ever name, order or override, so
 * it can only fail the declared-set check.
 */
export const openedLayers = (css: string): string[] => {
  const names = new Set<string>();
  const walk = (rules: CSSRuleList, prefix: string): void => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerBlockRule) {
        const name = rule.name ? prefix + rule.name : "(anonymous)";
        names.add(name);
        walk(rule.cssRules, rule.name ? `${name}.` : prefix);
      } else {
        const children = childRules(rule);
        if (children) walk(children, prefix);
      }
    }
  };
  walk(parse(css).cssRules, "");
  return [...names].sort();
};

/**
 * Every layer name a stylesheet introduces into the cascade order: the blocks it
 * opens, and the names of any `@layer` statement after the first. The first
 * statement is the order statement, checked against the ten by name on its own;
 * a later one is how a layer can enter the order without a single rule being
 * written into it — `@layer ds.rogue;` opens nothing, so `openedLayers` cannot
 * see it, and it is a name in the order all the same.
 *
 * `openedLayers` stays block-only, because what a file writes to is the question
 * the README's tables ask and the question `usedLayers` answers.
 */
export const namedLayers = (css: string): string[] => {
  const names = new Set(openedLayers(css));
  const statements: string[][] = [];
  const walk = (rules: CSSRuleList): void => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerStatementRule)
        statements.push(Array.from(rule.nameList));
      const children = childRules(rule);
      if (children) walk(children);
    }
  };
  walk(parse(css).cssRules);
  for (const statement of statements.slice(1))
    for (const name of statement) names.add(name);
  return [...names].sort();
};

/** The start selector of every `@scope` block, with the layer it sits in. */
export const scopes = (css: string): { layer: string; start: string }[] => {
  const found: { layer: string; start: string }[] = [];
  const walk = (rules: CSSRuleList, layer: string): void => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerBlockRule) {
        walk(rule.cssRules, layer ? `${layer}.${rule.name}` : rule.name);
        continue;
      }
      if (rule instanceof CSSScopeRule)
        found.push({ layer: layer || "(unlayered)", start: rule.start ?? "" });
      const children = childRules(rule);
      if (children) walk(children, layer);
    }
  };
  walk(parse(css).cssRules, "");
  return found;
};

/** The layers in which a stylesheet confines rules to pragma territory. */
export const scopedLayers = (css: string): string[] =>
  [...new Set(scopes(css).map((scope) => scope.layer))].sort();

/**
 * Every rule in one of the named layers that styles an element and that no
 * `@scope (.ds)` block encloses, labelled by its layer. A rule here reaches every
 * page the stylesheet is loaded on, which for an element selector is defect D3 of
 * the cascade programme: pragma's typography competing with a host page's for the
 * same `<p>`, settled by source order one property at a time.
 *
 * A rule that declares nothing but custom properties is not an element rule and
 * is not counted: it changes no computed value until some other rule reads one of
 * them, and the rules that read them are scoped. That is the README's own reason
 * for leaving `grid.css`'s `:root` defaults where they are.
 */
export const unconfinedElementRules = (
  css: string,
  layers: string[],
): string[] =>
  styleRules(css)
    .filter(
      (rule) =>
        layers.includes(rule.layer) &&
        !rule.confined &&
        rule.properties.some((property) => !property.startsWith("--")),
    )
    .map((rule) => `${rule.layer} ${rule.selector}`);

/**
 * How a rule that the cascade sorts by layer is labelled, or nothing for a rule
 * it does not sort. Style rules are the obvious ones; a browser also settles
 * duplicate `@keyframes`, `@font-face` and `@property` by layer, measured in
 * Chromium 151 and Firefox 153, so each of them written into a layer is a rule
 * in that layer. Grouping rules are not listed: they hold rules, and the rules
 * they hold are reached by walking through them.
 */
const sortedByLayer = (rule: CSSRule): string | undefined => {
  if (rule instanceof CSSStyleRule) return `style rule (${rule.selectorText})`;
  if (rule instanceof CSSKeyframesRule) return `@keyframes ${rule.name}`;
  if (rule instanceof CSSFontFaceRule) return "@font-face";
  if (rule instanceof CSSPropertyRule) return `@property ${rule.name}`;
  return undefined;
};

/**
 * Every rule the cascade sorts whose nearest enclosing layer is exactly the named
 * one — rules written into a layer itself rather than into one of its sublayers.
 * Nesting inside `@scope`, `@media` or another style rule does not change which
 * layer a rule is in.
 */
export const directRulesIn = (css: string, layer: string): string[] => {
  const found: string[] = [];
  const walk = (rules: CSSRuleList, current: string): void => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerBlockRule) {
        walk(rule.cssRules, current ? `${current}.${rule.name}` : rule.name);
        continue;
      }
      const label = sortedByLayer(rule);
      if (label !== undefined && current === layer) found.push(label);
      // A keyframes rule holds keyframes, not rules a layer sorts on their own.
      if (rule instanceof CSSKeyframesRule) continue;
      const children = childRules(rule);
      if (children) walk(children, current);
    }
  };
  walk(parse(css).cssRules, "");
  return found;
};

/** The properties every style rule directly in a layer declares, labelled. */
export const declarationsIn = (css: string, layer: string): string[] =>
  styleRules(css)
    .filter((rule) => rule.layer === layer)
    .flatMap((rule) =>
      rule.properties.map((property) => `${rule.selector} ${property}`),
    );

/** Every important declaration a stylesheet makes, labelled, as the browser reads it. */
export const importantDeclarations = (css: string): string[] =>
  styleRules(css).flatMap((rule) =>
    rule.important.map((property) => `${rule.selector} ${property}`),
  );

/** The custom properties a stylesheet registers outside every layer, by name. */
export const registeredProperties = (css: string): string[] =>
  Array.from(parse(css).cssRules)
    .filter((rule): rule is CSSPropertyRule => rule instanceof CSSPropertyRule)
    .map((rule) => rule.name);

/**
 * Which of the declared layers a stylesheet uses. A parent counts as used when a
 * sublayer of it carries rules: `ds.components` earns its place in the statement
 * by ordering its tiers, not by holding rules of its own.
 */
export const usedLayers = (css: string, declared: string[]): string[] => {
  const opened = openedLayers(css);
  return declared.filter((name) =>
    opened.some((open) => open === name || open.startsWith(`${name}.`)),
  );
};

/** The at-rule a top-level rule is, named as it is written. */
const kindOf = (rule: CSSRule): string => {
  if (rule instanceof CSSLayerStatementRule) return "@layer statement";
  if (rule instanceof CSSLayerBlockRule) return "@layer";
  if (rule instanceof CSSFontFaceRule) return "@font-face";
  if (rule instanceof CSSKeyframesRule) return "@keyframes";
  if (rule instanceof CSSPropertyRule) return "@property";
  if (rule instanceof CSSStyleRule) return `style rule (${rule.selectorText})`;
  return rule.constructor.name;
};

/** Every rule at a stylesheet's top level, by kind, in order. */
export const topLevelKinds = (css: string): string[] =>
  Array.from(parse(css).cssRules, kindOf);

/**
 * The top-level rules that are neither the statement nor a layer — everything a
 * layer could have sorted and does not. A style rule among them is the defect
 * this test exists to catch: an unlayered author rule beats every layered one,
 * whatever the layer order says.
 */
export const unlayeredKinds = (css: string): string[] => [
  ...new Set(
    topLevelKinds(css).filter(
      (kind) => kind !== "@layer" && kind !== "@layer statement",
    ),
  ),
];

/** Whether a stylesheet writes an at-rule of a kind outside every layer. */
export const authorsAtTopLevel = (css: string, atRule: string): boolean =>
  topLevelKinds(css).includes(atRule);

// ---------------------------------------------------------------------------
// The text
// ---------------------------------------------------------------------------

const withoutComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Whitespace runs collapsed, so a statement can be compared across two files. */
export const oneLine = (text: string): string =>
  text.trim().replace(/\s+/g, " ");

/**
 * The `@layer` order statement a stylesheet states, as written. Comments go
 * first: this package's entry quotes its own import line in its header.
 */
export const statementOf = (css: string): string =>
  oneLine(withoutComments(css).match(/@layer\b[^;{]*;/)?.[0] ?? "");

/** The files a stylesheet imports, in order, as written. */
export const importsOf = (css: string): string[] =>
  Array.from(
    withoutComments(css).matchAll(/@import\s+url\(\s*["']([^"']+)["']\s*\)/g),
    (match) => match[1] ?? "",
  );

/**
 * Every `@import` a file writes after its first block, which is every one a
 * browser will refuse: an `@import` is only valid before any rule, a layer
 * statement and `@charset` excepted. Vite inlines it anyway, so the resolved
 * stylesheet the rest of this file reads cannot show it — this is the one check
 * that has to read the file as written.
 */
export const lateImports = (raw: string): string[] => {
  const text = withoutComments(raw);
  const firstBlock = text.indexOf("{");
  if (firstBlock === -1) return [];
  return Array.from(
    text.slice(firstBlock).matchAll(/@import\b[^;]*;/g),
    (match) => oneLine(match[0] ?? ""),
  );
};

/** How many `@property` registrations a file writes, whether or not they survive. */
export const authoredProperties = (css: string): number =>
  withoutComments(css).match(/@property\b/g)?.length ?? 0;

// ---------------------------------------------------------------------------
// The README
// ---------------------------------------------------------------------------

/** The lines under a heading, up to the next heading of any level. */
const section = (heading: string): string => {
  const lines = readme.split("\n");
  const start = lines.findIndex(
    (line) => /^#+ /.test(line) && line.replace(/^#+ /, "") === heading,
  );
  if (start === -1) throw new Error(`the README has no "${heading}" heading`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#+ /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
};

/** The body rows of the one table under a heading, cell by trimmed cell. */
export const tableUnder = (heading: string): string[][] =>
  section(heading)
    .split("\n")
    .filter((line) => line.trimStart().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => !cells.every((cell) => /^:?-+:?$/.test(cell)))
    .slice(1);

/** The backticked tokens in a cell, which is how the README names a thing. */
export const ticked = (cell: string): string[] =>
  Array.from(cell.matchAll(/`([^`]+)`/g), (match) => match[1] ?? "");

/** Whether a cell's answer is yes. */
export const saysYes = (cell: string): boolean =>
  cell.toLowerCase().startsWith("yes");

/**
 * The fenced block under a heading that holds a layer statement and nothing
 * else. The "Migrating" section's block also opens with a statement, and is not
 * this one; a heading is passed so the test names which block it is reading.
 */
export const statementFenceUnder = (heading: string): string => {
  const fences = Array.from(
    section(heading).matchAll(/```css\n([\s\S]*?)```/g),
    (match) => (match[1] ?? "").trim(),
  );
  const statement = fences.find((fence) => /^@layer\b[^;{]*;$/.test(fence));
  if (statement === undefined)
    throw new Error(`no layer statement is quoted under "${heading}"`);
  return oneLine(statement);
};

/** What one of the README's layer tables says about one file. */
export interface DocumentedFile {
  /** Every layer a row gives the file. */
  layers: Set<string>;
  /** The layers a row also marks as confined to pragma territory. */
  scoped: Set<string>;
}

/** Whether a backticked token in a table cell names a stylesheet or a package. */
const isSourceName = (token: string): boolean =>
  token.endsWith(".css") || token.startsWith("@canonical/");

/**
 * Every file the README's two layer tables name, merged. A file may appear in
 * more than one row — `spacing.css` puts its tokens in one layer and its
 * container rule in another — so what the test binds is one answer per file and
 * per layer: the layers of a file are the union of its rows, and a layer is
 * scoped when a row that names it says yes. The README says as much, because
 * reordering two rows of the same file changes nothing a browser can see.
 */
export const documentedFiles = (): Map<string, DocumentedFile> => {
  const files = new Map<string, DocumentedFile>();
  const add = (name: string, layers: string[], scoped: boolean): void => {
    const entry = files.get(name) ?? {
      layers: new Set<string>(),
      scoped: new Set<string>(),
    };
    for (const layer of layers) {
      entry.layers.add(layer);
      if (scoped) entry.scoped.add(layer);
    }
    files.set(name, entry);
  };

  for (const [file, layer, scope] of tableUnder("What Is Layered Where"))
    for (const name of ticked(file ?? "").filter(isSourceName))
      add(name, ticked(layer ?? ""), saysYes(scope ?? ""));

  // The generated token files carry their layer in the design-token table
  // instead, so that the two tables state each fact once (F, §8.2 rule 1). Only
  // the ones the entry imports belong in this map; the other two are checked
  // against the entry's imports from the other side, by tokenTableRows below.
  for (const row of tokenTableRows())
    if (row.imported) add(row.file, [...row.layers], false);

  return files;
};

/** What the design-token table says about one generated file. */
export interface TokenTableRow {
  /** The specifier, as `src/index.css` would write it. */
  file: string;
  /** The layer the file opens, empty when the table says it opens none. */
  layers: Set<string>;
  /** Whether the table claims this package's entry imports it. */
  imported: boolean;
}

/** Every row of the design-token table: the contract with the generator. */
export const tokenTableRows = (): TokenTableRow[] =>
  tableUnder("Design Tokens").map(([set, , layer, imported]) => ({
    file: `@canonical/design-tokens/dist/${ticked(set ?? "")[0]}.css`,
    layers: new Set(ticked(layer ?? "")),
    imported: saysYes(imported ?? ""),
  }));
