/**
 * Just enough CSS machinery to answer two questions about an entry point
 * without a browser: what does it pull in, and what does it deliver?
 *
 * `resolve` inlines the `@import` graph the way a bundler does — an imported
 * sheet's text takes the place of its `@import` rule — resolving bare package
 * names through `node_modules` and honouring a package's `exports` map for
 * subpaths, which is how `@canonical/styles-typography/mapper.css` finds its
 * file. `inventory` then walks the result and lists every style rule with the
 * cascade layer it sits in, so two stylesheets can be compared by what they
 * deliver rather than by how they are written.
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";

const IMPORT = /@import\s+url\(\s*["']([^"']+)["']\s*\)\s*;/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;

const packageEntry = (dir: string): string => {
  const pkg = JSON.parse(
    readFileSync(resolvePath(dir, "package.json"), "utf8"),
  );
  const entry = pkg.exports?.["."] ?? pkg.main ?? "index.css";
  return resolvePath(dir, typeof entry === "string" ? entry : entry.default);
};

const subpath = (dir: string, rest: string): string => {
  const pkg = JSON.parse(
    readFileSync(resolvePath(dir, "package.json"), "utf8"),
  );
  const mapped = pkg.exports?.[`./${rest}`];
  return resolvePath(dir, typeof mapped === "string" ? mapped : rest);
};

const specifier = (spec: string, fromFile: string): string => {
  if (spec.startsWith(".") || spec.startsWith("/"))
    return resolvePath(dirname(fromFile), spec);
  const parts = spec.split("/");
  const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  const rest = spec.slice(name.length).replace(/^\//, "");
  let dir = dirname(fromFile);
  for (;;) {
    const candidate = resolvePath(dir, "node_modules", name);
    try {
      if (statSync(candidate).isDirectory())
        return rest ? subpath(candidate, rest) : packageEntry(candidate);
    } catch {
      // not here; keep walking up
    }
    const up = dirname(dir);
    if (up === dir) throw new Error(`cannot resolve ${spec} from ${fromFile}`);
    dir = up;
  }
};

/** The entry's `@import` graph, inlined into one stylesheet. */
export const resolve = (entry: string): string => {
  const seen = new Set<string>();
  const load = (file: string): string => {
    if (seen.has(file)) return "";
    seen.add(file);
    // Comments go first, so an `@import` quoted in a header is not mistaken
    // for a real one.
    const text = readFileSync(file, "utf8").replace(COMMENT, "");
    return text.replace(IMPORT, (_match, spec: string) =>
      load(specifier(spec, file)),
    );
  };
  return load(resolvePath(entry));
};

export interface Rule {
  /** The layer the rule sits in, dotted, or "" when it is in none. */
  layer: string;
  /** The enclosing at-rules, if any: `@media (min-width: 768px)`, and so on. */
  context: string;
  selector: string;
  /** Property names, sorted, so two orderings of the same block compare equal. */
  properties: string[];
}

/**
 * Every style rule in a resolved stylesheet, with its layer. At-rules that hold
 * other rules (`@media`, `@supports`, `@scope`) contribute their own contents;
 * their prelude is folded into the selector so a rule inside a media query is
 * not confused with the same selector outside one.
 */
export const inventory = (css: string): Rule[] => {
  const rules: Rule[] = [];
  const text = css.replace(COMMENT, "");
  const walk = (body: string, layer: string, prefix: string): void => {
    let depth = 0;
    let prelude = "";
    let start = 0;
    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      if (char === "{") {
        if (depth === 0) {
          prelude = body.slice(start, i).trim();
          start = i + 1;
        }
        depth++;
        continue;
      }
      if (char === "}") {
        depth--;
        if (depth === 0) {
          const inner = body.slice(start, i);
          const at = /^@([a-z-]+)\s*(.*)$/is.exec(prelude);
          if (at?.[1] === "layer") {
            const name = at[2].trim();
            walk(inner, layer ? `${layer}.${name}` : name, prefix);
          } else if (at) {
            walk(inner, layer, `${prefix}${at[0]} `);
          } else {
            const properties = inner
              .split(";")
              .map((part) => part.split(":")[0].trim())
              .filter((name) => name && !name.includes("{"));
            rules.push({
              layer,
              context: prefix.trim(),
              selector: prelude.replace(/\s+/g, " "),
              properties: [...properties].sort(),
            });
            // A nested rule inside a declaration block (CSS nesting) is walked
            // too, so nothing hides inside one.
            if (inner.includes("{")) walk(inner, layer, `${prefix}${prelude} `);
          }
          start = i + 1;
        }
        continue;
      }
      if (depth === 0 && char === ";") start = i + 1;
    }
  };
  walk(text, "", "");
  return rules;
};

/** The layers a stylesheet opens a block for, deduplicated and sorted. */
export const layersOpened = (css: string): string[] =>
  [...new Set(inventory(css).map((rule) => rule.layer))].filter(Boolean).sort();

/** A stable, order-independent description of what a stylesheet delivers. */
export const fingerprint = (css: string): string[] =>
  inventory(css)
    .map(
      (rule) =>
        `${rule.layer || "(unlayered)"} | ${rule.context} | ${rule.selector} | ${rule.properties.join(" ")}`,
    )
    .sort();
