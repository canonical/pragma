/**
 * The stylesheet under test, and the README that documents it.
 *
 * Everything here runs in the browser. `@layer` and `@scope` are cascade
 * structure, and the CSSOM of an engine that implements the cascade is the only
 * parser that answers questions about them honestly: a regular expression over
 * the text would report what was typed, not what a browser understood. So the
 * layer and scope facts below come from `CSSStyleSheet.replaceSync`, and the
 * text is read only for questions that are genuinely about text — which files
 * the entry imports, and what the README says.
 *
 * Nothing is transformed. Vite resolves the `@import` graph the way a consumer's
 * bundler resolves it, `?inline` hands the resolved text to the test, and `?raw`
 * hands over a single file unresolved.
 */

import antipationCss from "@canonical/design-tokens/dist/modifiers.anticipation.css?inline";
import criticalityCss from "@canonical/design-tokens/dist/modifiers.criticality.css?inline";
import emphasisCss from "@canonical/design-tokens/dist/modifiers.emphasis.css?inline";
import importanceCss from "@canonical/design-tokens/dist/modifiers.importance.css?inline";
import surfacesCss from "@canonical/design-tokens/dist/modifiers.surfaces.css?inline";
import themeCss from "@canonical/design-tokens/dist/modifiers.theme.css?inline";
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
 * The two layers the statement declares and this package deliberately leaves
 * empty: the component packages move into them in step F-4 of the cascade
 * programme. Naming them here rather than at first appearance is what fixes
 * their order, so they have to be declared before anything writes to them.
 */
export const RESERVED_LAYERS = ["ds.components.global", "ds.components.app"];

/** The layer names the `@canonical/design-tokens` plugin emits (its README's row). */
export const TOKEN_PLUGIN_LAYERS = {
  "sets.primitive": "ds.tokens",
  "modifiers.theme": "ds.modifiers",
  "modifiers.surfaces": "ds.surfaces",
  states: "ds.states",
};

/**
 * Every file the package's own `src/` holds, resolved. The glob is what makes a
 * new stylesheet fail the tables below: a file nobody documented still turns up
 * here, and a file the README names that no longer exists resolves to nothing.
 */
const localSources = import.meta.glob<string>("../../src/*.css", {
  eager: true,
  import: "default",
  query: "?inline",
});

/** The same files by their basename, which is how the README names them. */
export const LOCAL_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(localSources).map(([path, css]) => [
    path.replace("../../src/", ""),
    css,
  ]),
);

/**
 * The packages and generated files the entry imports by name. A static map is
 * unavoidable — a bundler cannot resolve a specifier a test computes at run time
 * — so the test asserts that its keys are exactly the specifiers the entry
 * imports, and an import added without a line here fails rather than passing
 * unchecked.
 */
export const EXTERNAL_SOURCES: Record<string, string> = {
  "@canonical/design-tokens/dist/modifiers.anticipation.css": antipationCss,
  "@canonical/design-tokens/dist/modifiers.criticality.css": criticalityCss,
  "@canonical/design-tokens/dist/modifiers.emphasis.css": emphasisCss,
  "@canonical/design-tokens/dist/modifiers.surfaces.css": surfacesCss,
  "@canonical/design-tokens/dist/modifiers.theme.css": themeCss,
  "@canonical/design-tokens/dist/sets.primitive.css": primitiveCss,
  "@canonical/design-tokens/dist/states.css": statesCss,
  "@canonical/styles-typography": typographyCss,
};

/** The resolved text of a file the README or the entry names, if it exists. */
export const sourceOf = (name: string): string | undefined =>
  EXTERNAL_SOURCES[name] ?? LOCAL_SOURCES[name.replace(/^\.\//, "")];

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

/** The at-rule a top-level rule is, named as it is written. */
const kindOf = (rule: CSSRule): string => {
  if (rule instanceof CSSLayerStatementRule) return "@layer statement";
  if (rule instanceof CSSLayerBlockRule) return "@layer";
  if (rule instanceof CSSImportRule) return "@import";
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
    (match) => match[1] as string,
  );

/**
 * Whether a file writes an at-rule at its top level. Every block in this
 * repository indents its contents, so a rule written at column zero is a rule
 * outside every block — which is the question the README's unlayered list asks.
 */
export const authorsAtTopLevel = (css: string, atRule: string): boolean =>
  new RegExp(`^${atRule}\\b`, "m").test(withoutComments(css));

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
  Array.from(cell.matchAll(/`([^`]+)`/g), (match) => match[1] as string);

/**
 * The fenced block under a heading that holds a layer statement and nothing
 * else. The "Migrating" section's block also opens with a statement, and is not
 * this one; a heading is passed so the test names which block it is reading.
 */
export const statementFenceUnder = (heading: string): string => {
  const fences = Array.from(
    section(heading).matchAll(/```css\n([\s\S]*?)```/g),
    (match) => (match[1] as string).trim(),
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
 * container rule in another — so the layers of a file are the union of its rows,
 * and the same for the ones each row marks scoped.
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

  for (const cells of tableUnder("What is layered where"))
    for (const name of ticked(cells[0] as string).filter(isSourceName))
      add(
        name,
        ticked(cells[1] as string),
        (cells[2] as string).toLowerCase().startsWith("yes"),
      );

  // The generated token files carry their layer in the design-token table
  // instead, so that the two tables state each fact once (F, §8.2 rule 1).
  for (const cells of tableUnder("Design tokens"))
    add(
      `@canonical/design-tokens/dist/${ticked(cells[0] as string)[0]}.css`,
      ticked(cells[2] as string),
      false,
    );

  return files;
};
