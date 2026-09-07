// @vitest-environment node

/**
 * elements.css is a copy of pragma's three element layers, re-addressed to an
 * island root. A copy drifts, so this test binds it to pragma's source files in
 * the workspace: it reads both sides, walks their rules, and fails when a rule,
 * a declaration, a condition or the order differs from the confined form of
 * the original. It runs without a browser: the question is what the files say,
 * not what a browser computes from them; the browser fixtures answer that one.
 *
 * The sources are read from pragma's entry rather than named: everything
 * `@canonical/styles/elements.css` composes, pragma's own copy of the three
 * layers addressed to the page, followed through its local and typography
 * imports. The mapping from a source selector to its confined form is the
 * table in `confined()` below, in words in the README's section on the
 * confined copy. The exceptions, rules that exist on one side only, each carry
 * their reason.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** A file relative to this test, as text; a missing one names what is needed. */
const read = (path: string): string => {
  try {
    return readFileSync(new URL(path, import.meta.url), "utf8");
  } catch {
    throw new Error(
      `${path} is not in the workspace: this test binds the copy to the @canonical/styles release that ships its stylesheet as entries (tokens.css, elements.css, layout.css)`,
    );
  }
};

/** The layers the copy carries, in pragma's order. */
const ELEMENT_LAYERS = ["normalize", "ds.reset", "ds.typography"];

/** Pragma's own order statement, which each of its entries opens with. */
const PRAGMA_ORDER =
  "@layer normalize, ds.tokens, ds.reset, ds.typography, ds.modifiers, ds.surfaces, ds.states, ds.components, ds.components.global, ds.components.sites, ds.components.documentation, ds.components.stores, ds.components.apps";

/** The scope prelude every confined block uses. */
const SCOPE = "(.ds)";

/** A selector that is a control, or a control type, in pragma's reset. */
const CONTROLS = new Set([
  "button",
  "input",
  "optgroup",
  "select",
  "textarea",
  '[type="button"]',
  '[type="reset"]',
  '[type="submit"]',
  '[type="search"]',
]);

/** The outermost island root. */
const ROOT = ":where(:scope:not(.ds *))";

/** The universal selector and its two pseudo-elements, in either spelling. */
const UNIVERSAL = new Set([
  "*",
  "::before",
  "::after",
  "*::before",
  "*::after",
]);

/** The universal box-sizing rule, written outside the scope block. */
const UNIVERSAL_CONFINED = [
  ":where(.ds, .ds *)",
  ":where(.ds, .ds *)::before",
  ":where(.ds, .ds *)::after",
];

interface Rule {
  /** The file the rule came from, for messages. */
  file: string;
  /** The layer the rule sits in, dotted when nested. */
  layer: string;
  /** The `@scope` prelude the rule sits in, or null when unscoped. */
  scope: string | null;
  /** The preludes of the at-rules around it other than layer and scope (`@media`, `@supports`), outermost first. */
  conditions: string[];
  /** The selector lists from the outermost style rule inward, in source order. */
  path: string[][];
  /** The rule's own declarations, `property: value`, in source order. */
  declarations: string[];
}

interface Walked {
  file: string;
  rules: Rule[];
  /** At-rule statements (`@import`, `@layer a, b;`), whitespace collapsed. */
  statements: string[];
  /** Preludes of the at-rules that opened a block, `@layer` and `@scope` excepted. */
  blocks: string[];
}

/** Whitespace collapsed, no space inside parentheses, one space after a comma. */
const collapse = (text: string): string =>
  text
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*,\s*/g, ", ")
    .trim();

/** A selector list split on the commas outside parentheses. */
const splitList = (selector: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of selector) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
};

/** `property: value`, one space after the colon, no trailing semicolon. */
const declaration = (text: string): string => {
  const colon = text.indexOf(":");
  return `${text.slice(0, colon).trim()}: ${text.slice(colon + 1).trim()}`;
};

/**
 * Walk a stylesheet's rules with a prelude walker: each `{` is read back to
 * the previous `{`, `}` or `;`, whitespace collapsed; `@layer`, `@scope` and
 * the other at-rule blocks are tracked; a style rule's declarations are the
 * `;`-separated texts inside its block that are not blocks of their own.
 */
const walk = (css: string, file: string): Walked => {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Rule[] = [];
  const statements: string[] = [];
  const blocks: string[] = [];
  type Frame =
    | { kind: "layer"; name: string }
    | { kind: "scope"; prelude: string }
    | { kind: "at"; prelude: string }
    | { kind: "style"; rule: Rule };
  const stack: Frame[] = [];
  const layerOf = (): string =>
    stack
      .filter(
        (frame): frame is { kind: "layer"; name: string } =>
          frame.kind === "layer",
      )
      .map((frame) => frame.name)
      .join(".");
  const scopeOf = (): string | null => {
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const frame = stack[i];
      if (frame?.kind === "scope") return frame.prelude;
    }
    return null;
  };
  const conditionsOf = (): string[] =>
    stack
      .filter(
        (frame): frame is { kind: "at"; prelude: string } =>
          frame.kind === "at",
      )
      .map((frame) => frame.prelude);
  const pathOf = (): string[][] =>
    stack
      .filter(
        (frame): frame is { kind: "style"; rule: Rule } =>
          frame.kind === "style",
      )
      .map((frame) => frame.rule.path[frame.rule.path.length - 1] ?? []);
  const top = (): Frame | undefined => stack[stack.length - 1];

  const open = (prelude: string): void => {
    if (prelude.startsWith("@layer ")) {
      stack.push({ kind: "layer", name: prelude.slice("@layer ".length) });
    } else if (prelude.startsWith("@scope ")) {
      stack.push({ kind: "scope", prelude: prelude.slice("@scope ".length) });
    } else if (prelude.startsWith("@")) {
      blocks.push(prelude);
      stack.push({ kind: "at", prelude });
    } else {
      const rule: Rule = {
        file,
        layer: layerOf(),
        scope: scopeOf(),
        conditions: conditionsOf(),
        path: [...pathOf(), splitList(prelude)],
        declarations: [],
      };
      rules.push(rule);
      stack.push({ kind: "style", rule });
    }
  };
  const statement = (body: string): void => {
    if (!body) return;
    const frame = top();
    if (frame?.kind === "style")
      frame.rule.declarations.push(declaration(body));
    else if (body.startsWith("@")) statements.push(body);
    else if (frame?.kind !== "at")
      throw new Error(`${file}: stray text "${body}"`);
  };

  let buffer = "";
  let depth = 0;
  let quote: string | null = null;
  for (const char of text) {
    if (quote) {
      buffer += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (depth > 0) {
      buffer += char;
      continue;
    }
    if (char === "{") {
      open(collapse(buffer));
      buffer = "";
    } else if (char === "}") {
      statement(collapse(buffer));
      buffer = "";
      if (!stack.pop()) throw new Error(`${file}: unbalanced braces`);
    } else if (char === ";") {
      statement(collapse(buffer));
      buffer = "";
    } else {
      buffer += char;
    }
  }
  if (stack.length) throw new Error(`${file}: unclosed block`);
  return { file, rules, statements, blocks };
};

/** The `@import` statements of a walked file. */
const importsOf = (walked: Walked): string[] =>
  walked.statements.filter((line) => line.startsWith("@import"));

/** The file a local import (`./x.css`) names, or undefined. */
const localImport = (line: string): string | undefined =>
  /["']\.\/([\w.-]+\.css)["']/.exec(line)?.[1];

/** The distinct top-level layer names, in order of first appearance. */
const layerOrder = (rules: Rule[]): string[] =>
  Array.from(new Set(rules.map((rule) => rule.layer)));

/** Whether a rule declares a property. */
const declares = (rule: Rule, property: string): boolean =>
  rule.declarations.some((line) => line.startsWith(`${property}:`));

/** Whether a rule declares custom properties and nothing else. */
const tokensOnly = (rule: Rule): boolean =>
  rule.declarations.every((line) => line.startsWith("--"));

/** Whether a walked file opens one of the three element layers. */
const opensElementLayer = (walked: Walked): boolean =>
  walked.rules.some((rule) => ELEMENT_LAYERS.includes(rule.layer));

/**
 * The document element in the spellings pragma uses: `html` or `:root`, bare
 * or inside `:where()`, with or without a `:not()` list. Returns the list.
 */
const documentElement = (
  selector: string,
): { excluded: string | undefined } | undefined => {
  const match =
    /^:where\((?:html|:root)(?::not\((.+)\))?\)$/.exec(selector) ??
    /^(?:html|:root)(?::not\((.+)\))?$/.exec(selector);
  return match ? { excluded: match[1] } : undefined;
};

/**
 * The confined form of a source rule's outermost selector list, or null for a
 * rule the copy leaves out. This is the mapping table.
 */
const confined = (rule: Rule): string[] | null => {
  const list = rule.path[0] ?? [];
  const only = list.length === 1 ? list[0] : undefined;
  // The document element becomes the outermost island root, and a `:not()`
  // list it carries stays: on the page it is inert, on an island root it keeps
  // a control or a preformatted block that is itself the root at its default.
  const root = only === undefined ? undefined : documentElement(only);
  if (root)
    return [
      root.excluded ? `:where(:scope:not(.ds *, ${root.excluded}))` : ROOT,
    ];
  // The body: its margin is zeroed only when the body itself is the island,
  // because the margin of an element a host page owns is not this package's
  // call; anything else the body declares is the island root's.
  if (only === "body")
    return declares(rule, "margin") ? [":where(:scope:is(body))"] : [ROOT];
  // The universal box-sizing rule sits outside the scope block, the long way.
  if (list.every((selector) => UNIVERSAL.has(selector)))
    return UNIVERSAL_CONFINED;
  // A list of controls reaches a control that is itself the island.
  if (list.every((selector) => CONTROLS.has(selector)))
    return [`:where(:scope, :scope *):is(${list.join(", ")})`];
  // Everything else is itself, and a class an island root can carry (`.p` on a
  // field error, `.code` on an inline code span, `.editorial` on a flipped
  // region) gets its `:scope.x` twin.
  return list.flatMap((selector) =>
    /^\.[\w-]+$/.test(selector) ? [selector, `:scope${selector}`] : [selector],
  );
};

/** Rules present in pragma's files that the copy leaves out, with the reason. */
const SOURCE_ONLY: ReadonlyArray<{
  layer: string;
  selector: string;
  reason: string;
}> = [];

/** Rules present in the copy that pragma's files do not have, with the reason. */
const COPY_ONLY: ReadonlyArray<{
  layer: string;
  selector: string;
  reason: string;
}> = [];

/** Whether an exception entry names a rule. */
const excepted = (
  entries: ReadonlyArray<{ layer: string; selector: string }>,
  rule: Rule,
): boolean =>
  entries.some(
    (entry) =>
      entry.layer === rule.layer &&
      entry.selector === (rule.path[0] ?? []).join(", "),
  );

/**
 * A rule's identity for matching: its layer, the conditions around it, and its
 * selector lists, each sorted.
 */
const key = (layer: string, conditions: string[], path: string[][]): string =>
  JSON.stringify([layer, conditions, path.map((list) => [...list].sort())]);

/** The identity a source rule's counterpart must have in the copy, or null. */
const counterpartKey = (rule: Rule): string | null => {
  const expected = excepted(SOURCE_ONLY, rule) ? null : confined(rule);
  if (expected === null) return null;
  return key(rule.layer, rule.conditions, [expected, ...rule.path.slice(1)]);
};

/** A rule's identity for messages. */
const label = (rule: Rule): string =>
  `${rule.file} [${rule.layer}]${rule.conditions.length ? ` ${rule.conditions.join(" ")}` : ""} ${rule.path.map((list) => list.join(", ")).join(" { ")}`;

/** The `.css` files @canonical/styles exports, by their name under `src`. */
const exportedFiles = ((): string[] => {
  const manifest = JSON.parse(read("../../main/package.json")) as {
    exports: Record<string, string>;
  };
  return Array.from(
    new Set(
      Object.values(manifest.exports)
        .map((target) => /^\.\/src\/([\w.-]+\.css)$/.exec(target)?.[1])
        .filter((name): name is string => Boolean(name)),
    ),
  );
})();

const main = (file: string): Walked =>
  walk(read(`../../main/src/${file}`), `main/src/${file}`);
const typography = (file: string): Walked =>
  walk(read(`../../typography/src/${file}`), `typography/src/${file}`);

/** The file a typography package import names, or undefined. */
const typographyImport = (line: string): string | undefined =>
  /["']@canonical\/styles-typography\/(?:src\/)?([\w.-]+\.css)["']/.exec(
    line,
  )?.[1];

/**
 * The files an entry composes, in import order: its local imports and the
 * typography package's files, each followed through its own imports once.
 */
const composition = (entry: Walked): Walked[] => {
  const seen = new Set<string>([entry.file]);
  const follow = (walked: Walked): Walked[] =>
    importsOf(walked).flatMap((line) => {
      const local = localImport(line);
      const packaged = typographyImport(line);
      let next: Walked | undefined;
      if (local)
        next = walked.file.startsWith("typography/")
          ? typography(local)
          : main(local);
      else if (packaged) next = typography(packaged);
      if (!next || seen.has(next.file)) return [];
      seen.add(next.file);
      return [next, ...follow(next)];
    });
  return follow(entry);
};

/** Pragma's elements entry: the three layers addressed to the page. */
const elementsEntry = main("elements.css");

/** The engine the entry names: the typography file it imports that is one. */
const engineFile = ((): string => {
  const match = importsOf(elementsEntry)
    .map(typographyImport)
    .find((name): name is string => /^baseline-[a-z]+\.css$/.test(name ?? ""));
  if (!match) throw new Error("main/src/elements.css names no baseline engine");
  return match;
})();

/** The sources the copy binds to: everything the elements entry composes. */
const sources = composition(elementsEntry);
const copy = walk(read("../elements.css"), "vanilla-adapter/elements.css");

/** The source rules the copy binds to: those in the three element layers. */
const sourceRules = sources.flatMap((walked) =>
  walked.rules.filter((rule) => ELEMENT_LAYERS.includes(rule.layer)),
);

/** The source rules in any other layer, which is nothing the entry should compose. */
const otherRules = sources.flatMap((walked) =>
  walked.rules.filter((rule) => !ELEMENT_LAYERS.includes(rule.layer)),
);

describe("elements.css is pragma's element layers, confined", () => {
  it("binds to the files pragma's elements entry composes", () => {
    // Pragma's elements.css is the three layers addressed to the page; this
    // package's elements.css is the same three layers addressed to an island.
    // Its imports name the reset, the root baseline, the typography element
    // rules and one engine, and every file it composes opens an element layer.
    const files = sources.map((walked) => walked.file);
    expect(files).toContain("main/src/normalize.css");
    expect(files).toContain("main/src/reset.css");
    expect(files).toContain("typography/src/elements.css");
    expect(files).toContain(`typography/src/${engineFile}`);
    expect(engineFile).toBe("baseline-cap.css");
    expect(sources.filter((walked) => !opensElementLayer(walked))).toEqual([]);
    // The element rules that feed the engine come from a typography file that
    // is not the engine; without them a heading inside an island would compute
    // the paragraph's size.
    const feeders = sourceRules.filter(
      (rule) => rule.layer === "ds.typography" && declares(rule, "--font-size"),
    );
    expect(feeders.length).toBeGreaterThan(0);
    expect(
      feeders.every((rule) => rule.file !== `typography/src/${engineFile}`),
    ).toBe(true);
  });

  it("carries the three layers in pragma's order and nothing else", () => {
    expect(layerOrder(copy.rules)).toEqual(ELEMENT_LAYERS);
    expect(
      layerOrder(sourceRules).filter((name) => ELEMENT_LAYERS.includes(name)),
    ).toEqual(ELEMENT_LAYERS);
    // No import, no registration, no statement of its own: the layer order
    // comes from layers.css, and the engine reads its baseline unit with a
    // fallback rather than a registration.
    expect(copy.statements).toEqual([]);
    expect(copy.blocks).toEqual([]);
  });

  it("leaves nothing in pragma's other layers but custom properties", () => {
    // What these files keep outside the element layers would reach the page
    // unconfined, so it must be inert there: custom properties and nothing else.
    const styling = otherRules
      .filter((rule) => !tokensOnly(rule))
      .map((rule) => `${label(rule)}: ${rule.declarations.join("; ")}`);
    expect(styling).toEqual([]);
  });

  it("reads pragma's rules in their plain form, not a scoped one", () => {
    // The copy binds to pragma's plain stylesheet (VC.30): a scoped source
    // would mean pragma confines its own layers again, and the mapping below
    // would no longer describe the copy.
    const scoped = sourceRules.filter((rule) => rule.scope !== null);
    expect(scoped.map(label)).toEqual([]);
  });

  it("confines every rule to an island: inside `@scope (.ds)`, or the universal rule outside it", () => {
    const loose = copy.rules.filter(
      (rule) =>
        rule.scope !== SCOPE &&
        !(
          rule.scope === null &&
          rule.path.length === 1 &&
          rule.path[0]?.every((selector) =>
            selector.startsWith(":where(.ds, .ds *)"),
          )
        ),
    );
    expect(loose.map(label)).toEqual([]);
    const preludes = new Set(
      copy.rules.map((rule) => rule.scope).filter((scope) => scope !== null),
    );
    expect(Array.from(preludes)).toEqual([SCOPE]);
  });

  it("gives every rule in pragma's files exactly one counterpart, with the same declarations, under the confined selector and the same condition", () => {
    // Counterparts are paired in source order within a key, because a file may
    // carry two rules with the same selector list (the engine's margin reset
    // and its variables), and the copy keeps them in the same order.
    const queues = new Map<string, Rule[]>();
    for (const rule of copy.rules) {
      const id = key(rule.layer, rule.conditions, rule.path);
      queues.set(id, [...(queues.get(id) ?? []), rule]);
    }
    const failures: string[] = [];
    for (const rule of sourceRules) {
      const id = counterpartKey(rule);
      if (id === null) continue;
      const counterpart = queues.get(id)?.shift();
      if (!counterpart) {
        failures.push(`${label(rule)}: no counterpart at ${id}`);
        continue;
      }
      if (
        JSON.stringify(counterpart.declarations) !==
        JSON.stringify(rule.declarations)
      )
        failures.push(
          `${label(rule)}: declarations differ\n  pragma: ${rule.declarations.join("; ")}\n  copy:   ${counterpart.declarations.join("; ")}`,
        );
    }
    for (const rule of Array.from(queues.values()).flat()) {
      if (!excepted(COPY_ONLY, rule))
        failures.push(`${label(rule)}: no rule in pragma's files`);
    }
    expect(failures).toEqual([]);
  });

  it("keeps pragma's order within each layer", () => {
    // Inside a layer, source order arbitrates between rules of equal weight,
    // so the copy has to keep pragma's sequence, not just its set: `p, .p`
    // reordered against `.code` would change which wins on a `<p class="code">`.
    for (const layer of ELEMENT_LAYERS) {
      const expected = sourceRules
        .filter((rule) => rule.layer === layer)
        .map(counterpartKey)
        .filter((id): id is string => id !== null);
      const actual = copy.rules
        .filter((rule) => rule.layer === layer && !excepted(COPY_ONLY, rule))
        .map((rule) => key(rule.layer, rule.conditions, rule.path));
      expect(actual, layer).toEqual(expected);
    }
  });

  it("names every exception to a rule that exists", () => {
    // An exception that no longer matches anything is a stale one.
    for (const entry of SOURCE_ONLY) {
      expect(
        sourceRules.some((rule) => excepted([entry], rule)),
        `${entry.layer} ${entry.selector}: ${entry.reason}`,
      ).toBe(true);
    }
    for (const entry of COPY_ONLY) {
      expect(
        copy.rules.some((rule) => excepted([entry], rule)),
        `${entry.layer} ${entry.selector}: ${entry.reason}`,
      ).toBe(true);
    }
  });
});

describe("@canonical/styles exposes what a mixed page needs", () => {
  /** An entry and the files it composes. */
  const entry = (file: string): Walked[] => {
    const walked = main(file);
    return [walked, ...composition(walked)];
  };
  const tokens = entry("tokens.css");
  const layout = entry("layout.css");

  it("states one order, pragma's thirteen names, in every exported file that states one", () => {
    // The adapter's statement comes first on a mixed page; pragma's arrives
    // later, at the top of each of its entries, and a later statement can add
    // layers but never reorder the ones already fixed. So every file the
    // package exports that states an order has to state the same one, and
    // state it first: the file list comes from the package's own export map,
    // so an entry added later is checked without this test being edited.
    const stating: string[] = [];
    const failures: string[] = [];
    for (const file of exportedFiles) {
      const walked = main(file);
      const statements = walked.statements.filter((line) =>
        line.startsWith("@layer "),
      );
      if (!statements.length) continue;
      stating.push(file);
      if (walked.statements[0] !== statements[0])
        failures.push(`${file}: the statement is not the first rule`);
      for (const statement of statements)
        if (statement !== PRAGMA_ORDER) failures.push(`${file}: ${statement}`);
    }
    expect(failures).toEqual([]);
    // The entry a pragma-only page loads, and the two a mixed page loads.
    for (const file of ["index.css", "tokens.css", "layout.css"])
      expect(stating, file).toContain(file);
    // And the entry this package's copy is a copy of.
    expect(stating).toContain("elements.css");
  });

  it("tokens.css and layout.css bring no element rule with them", () => {
    // The mixed page takes both unconfined, so what they bring into the three
    // layers must be inert outside an island: custom properties, or nothing.
    // An element rule there would style Vanilla's headings and paragraphs
    // from a pragma layer that sits above `vanilla`.
    const leaks = [...tokens, ...layout]
      .flatMap((walked) => walked.rules)
      .filter(
        (rule) => ELEMENT_LAYERS.includes(rule.layer) && !tokensOnly(rule),
      )
      .map((rule) => `${label(rule)}: ${rule.declarations.join("; ")}`);
    expect(leaks).toEqual([]);
  });

  it("tokens.css carries the typographic scale the copy reads", () => {
    // The element rules read the `--typography-*` values; the scale is tokens
    // and acts wherever it is written, so the copy carries none of it.
    const imports = tokens.flatMap(importsOf);
    expect(
      imports.some((line) => line.includes("dist/modifiers.typography.css")),
    ).toBe(true);
  });

  it("the elements entry composes the element files and nothing else", () => {
    // What index.css loads for the three layers is what elements.css composes,
    // so a pragma-only page and a mixed page start from the same rules.
    const indexImports = importsOf(main("index.css"));
    expect(indexImports.some((line) => line.includes("./normalize.css"))).toBe(
      true,
    );
    expect(indexImports.some((line) => line.includes("./reset.css"))).toBe(
      true,
    );
    expect(
      indexImports.some((line) =>
        line.includes("@canonical/styles-typography"),
      ),
    ).toBe(true);
    expect(elementsEntry.rules).toEqual([]);
    expect(importsOf(elementsEntry).length).toBe(4);
  });
});
