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

const packageEntry = (dir) => {
  const pkg = JSON.parse(
    readFileSync(resolvePath(dir, "package.json"), "utf8"),
  );
  const entry = pkg.exports?.["."] ?? pkg.main ?? "index.css";
  return resolvePath(dir, typeof entry === "string" ? entry : entry.default);
};

const subpath = (dir, rest) => {
  const pkg = JSON.parse(
    readFileSync(resolvePath(dir, "package.json"), "utf8"),
  );
  const mapped = pkg.exports?.[`./${rest}`];
  return resolvePath(dir, typeof mapped === "string" ? mapped : rest);
};

const specifier = (spec, fromFile) => {
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

/**
 * The entry's `@import` graph, inlined into one stylesheet, the way a browser
 * builds it: each `@import` is its own sheet and a file reached twice is
 * delivered twice. Nothing is de-duplicated, because de-duplicating here would
 * hide exactly the defect this is used to look for.
 */
export const resolve = (entry) => {
  /** @type {string[]} the files currently being inlined, innermost last */
  const open = [];
  const load = (file) => {
    if (open.includes(file))
      throw new Error(`import cycle: ${[...open, file].join(" -> ")}`);
    open.push(file);
    // Comments go first, so an `@import` quoted in a header is not mistaken
    // for a real one.
    const text = readFileSync(file, "utf8").replace(COMMENT, "");
    const inlined = text.replace(IMPORT, (_match, spec) =>
      load(specifier(spec, file)),
    );
    open.pop();
    return inlined;
  };
  return load(resolvePath(entry));
};

/**
 * Every file the entry's graph inlines, in the order a browser would reach
 * them, with repeats kept. A file that appears twice is delivered twice.
 */
export const graph = (entry) => {
  /** @type {string[]} */
  const files = [];
  /** @type {string[]} */
  const open = [];
  const load = (file) => {
    if (open.includes(file))
      throw new Error(`import cycle: ${[...open, file].join(" -> ")}`);
    open.push(file);
    files.push(file);
    const text = readFileSync(file, "utf8").replace(COMMENT, "");
    for (const [, spec] of text.matchAll(IMPORT)) load(specifier(spec, file));
    open.pop();
  };
  load(resolvePath(entry));
  return files;
};

/**
 * A declaration block with every nested block removed. Text is buffered as it is
 * read and flushed at each `;`, so a declaration survives; when a `{` arrives
 * the buffer is a nested rule's prelude, not a declaration, and is discarded
 * along with the block it opens.
 */
const withoutBlocks = (body) => {
  let depth = 0;
  let pending = "";
  let out = "";
  for (const char of body) {
    if (char === "{") {
      depth++;
      if (depth === 1) pending = "";
      continue;
    }
    if (char === "}") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth > 0) continue;
    pending += char;
    if (char === ";") {
      out += pending;
      pending = "";
    }
  }
  return out + pending;
};

/**
 * A style rule, as this file reports one.
 *
 * @typedef {object} Rule
 * @property {string} layer The cascade layer the rule sits in, dotted, or "" when it is in none.
 * @property {string} context The enclosing at-rules, if any: `@media (min-width: 768px)`, and so on.
 * @property {string} selector The rule's own selector, without that context.
 * @property {string[]} properties Property names, sorted, so two orderings of the same block compare equal.
 */

/**
 * Every style rule in a resolved stylesheet, with its layer. At-rules that hold
 * other rules (`@media`, `@supports`, `@scope`) contribute their own contents;
 * their prelude is folded into the selector so a rule inside a media query is
 * not confused with the same selector outside one.
 */
export const inventory = (css) => {
  /** @type {Rule[]} */
  const rules = [];
  const text = css.replace(COMMENT, "");
  const walk = (body, layer, prefix) => {
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
            // An at-rule may hold declarations of its own — a `@media` block
            // nested inside a style rule, retuning one custom property. Those
            // belong to the rule that encloses it, under this at-rule's prelude.
            const own = withoutBlocks(inner)
              .split(";")
              .map((part) => part.split(":")[0].trim())
              .filter(Boolean);
            if (own.length > 0 && prefix)
              rules.push({
                layer,
                context: `${prefix}${at[0]}`.trim(),
                selector: "",
                properties: [...own].sort(),
              });
            walk(inner, layer, `${prefix}${at[0]} `);
          } else {
            // Strip nested blocks first — a media query or a nested rule
            // inside this one is walked separately, and leaving its text here
            // would record its braces as a property name.
            const properties = withoutBlocks(inner)
              .split(";")
              .map((part) => part.split(":")[0].trim())
              .filter(Boolean);
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
export const layersOpened = (css) =>
  [...new Set(inventory(css).map((rule) => rule.layer))].filter(Boolean).sort();

/** A stable, order-independent description of what a stylesheet delivers. */
export const fingerprint = (css) =>
  inventory(css)
    .map(
      (rule) =>
        `${rule.layer || "(unlayered)"} | ${rule.context} | ${rule.selector} | ${rule.properties.join(" ")}`,
    )
    .sort();
