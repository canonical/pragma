import chalk from "chalk";
// Deep import, not #pipeline: the barrel re-exports collectCommands, which
// imports every domain barrel — including this one — so #pipeline here forms
// a module cycle that evaluates this domain's stories as undefined at load.
import { formatHeading } from "../../../pipeline/formatTerminal.js";
import type { Formatters } from "../../shared/formatters.js";
import type {
  OntologyClassFocus,
  OntologyDetailed,
  OntologyProperty,
} from "../../shared/types/index.js";
import type { ClassTreeNode } from "../helpers/buildClassTree.js";
import buildClassTree from "../helpers/buildClassTree.js";

/**
 * Formatter input for `ontology show`: the one complete structure plus the
 * projection controls resolved from the story params. `--full-uris` is
 * already applied to `ontology` by the story's `toOutput`, so the renderers
 * below never re-encode IRIs.
 */
export interface OntologyShowInput {
  readonly ontology: OntologyDetailed;
  /** Include datatype properties (attributes); default renders relations only. */
  readonly showProperties: boolean;
}

/**
 * Formatters for `pragma ontology show` output.
 *
 * All three modes are projections of the same {@link OntologyDetailed}
 * structure — they may style differently, but every fact they print comes
 * from that one shape, and the hierarchy is derived through the single
 * shared {@link buildClassTree} helper so it can never diverge between
 * output modes.
 *
 * - **plain**: chalk-styled header (name, metadata, counts), class
 *   hierarchy tree with instance counts and inline relations, constraints,
 *   and a next-command footer. Attributes render only with `--properties`.
 *   Renders the class deep dive when `focus` is present.
 * - **llm**: the same content as condensed Markdown.
 * - **json**: the complete {@link OntologyDetailed} structure itself
 *   (always everything — display flags never subset the canonical data).
 */
const formatters: Formatters<OntologyShowInput> = {
  plain({ ontology, showProperties }) {
    if (ontology.focus) return renderFocusPlain(ontology.focus);

    const lines: string[] = [];
    lines.push(
      formatHeading(`Ontology ${ontology.prefix}: — ${ontology.namespace}`),
    );
    lines.push(chalk.dim(summaryLine(ontology)));
    if (ontology.meta?.imports?.length) {
      lines.push(chalk.dim(`imports: ${ontology.meta.imports.join(", ")}`));
    }

    if (ontology.classes.length > 0) {
      lines.push("");
      for (const root of buildClassTree(ontology.classes)) {
        renderTreePlain(root, "", "", showProperties, lines);
      }
    }

    const looseRelations = unattachedToShow(ontology, showProperties);
    if (looseRelations.length > 0) {
      lines.push("");
      lines.push(
        `${chalk.bold("Unattached:")} ${looseRelations
          .map((p) => propLine(p, showProperties))
          .join(", ")}`,
      );
    }

    if (ontology.constraints && ontology.constraints.length > 0) {
      lines.push("");
      lines.push(chalk.bold("Constraints:"));
      for (const c of ontology.constraints) {
        const target = c.targetClass ? ` on ${c.targetClass}` : "";
        lines.push(
          `  ${c.shape}${target} ${chalk.dim(
            `(${c.propertyCount} property constraints)`,
          )}`,
        );
      }
    }

    lines.push("");
    lines.push(chalk.dim(footer(ontology)));

    return lines.join("\n");
  },

  llm({ ontology, showProperties }) {
    if (ontology.focus) return renderFocusLlm(ontology.focus);

    const lines: string[] = [];
    lines.push(`## Ontology ${ontology.prefix}: — ${ontology.namespace}`);
    lines.push(summaryLine(ontology));
    if (ontology.meta?.imports?.length) {
      lines.push(`imports: ${ontology.meta.imports.join(", ")}`);
    }
    lines.push("");

    if (ontology.classes.length > 0) {
      lines.push("### Classes");
      lines.push("```");
      for (const root of buildClassTree(ontology.classes)) {
        renderTreeLlm(root, 0, showProperties, lines);
      }
      lines.push("```");
    }

    const looseRelations = unattachedToShow(ontology, showProperties);
    if (looseRelations.length > 0) {
      lines.push(
        `Unattached: ${looseRelations
          .map((p) => propLine(p, showProperties))
          .join(", ")}`,
      );
    }

    if (ontology.constraints && ontology.constraints.length > 0) {
      lines.push("### Constraints");
      for (const c of ontology.constraints) {
        const target = c.targetClass ? ` targets ${c.targetClass}` : "";
        lines.push(`- ${c.shape}${target} (${c.propertyCount} constraints)`);
      }
    }

    lines.push("");
    lines.push(footer(ontology));

    return lines.join("\n");
  },

  json({ ontology }) {
    return JSON.stringify(ontology, null, 2);
  },
};

export default formatters;

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------

function allProperties(ontology: OntologyDetailed): OntologyProperty[] {
  return [
    ...ontology.classes.flatMap((c) => c.properties),
    ...ontology.unattached,
  ];
}

function summaryLine(ontology: OntologyDetailed): string {
  const props = allProperties(ontology);
  const relations = props.filter((p) => p.kind === "object").length;
  const attributes = props.length - relations;
  const parts = [
    `${ontology.classes.length} classes`,
    `${relations} relations`,
    `${attributes} attributes`,
  ];
  if (ontology.constraints?.length) {
    parts.push(`${ontology.constraints.length} shapes`);
  }
  if (ontology.meta?.version) parts.push(`v${ontology.meta.version}`);
  if (ontology.meta?.title) parts.push(ontology.meta.title);
  return parts.join(" · ");
}

/**
 * The next-step footer: the class deep dive, plus a runnable query seeded
 * with a real class from this namespace so follow-up querying starts from
 * copy-paste, not from reading SPARQL docs.
 */
function footer(ontology: OntologyDetailed): string {
  const seed =
    ontology.classes.find((c) => (c.instances ?? 0) > 0) ?? ontology.classes[0];
  const query = seed
    ? ` · pragma graph query "SELECT ?s WHERE { ?s a ${sparqlTerm(seed.iri)} } LIMIT 10"`
    : "";
  return `Next: pragma ontology show ${ontology.prefix} --class <Class>${query}`;
}

/**
 * Render an IRI as a valid SPARQL term: full URIs (present under
 * `--full-uris`) need `<...>`; compact prefixed IRIs are usable as-is.
 */
function sparqlTerm(iri: string): string {
  return iri.startsWith("http://") || iri.startsWith("https://")
    ? `<${iri}>`
    : iri;
}

/** Properties a class renders inline: relations always, attributes on demand. */
function inlineProperties(
  props: readonly OntologyProperty[],
  showProperties: boolean,
): readonly OntologyProperty[] {
  return showProperties ? props : props.filter((p) => p.kind === "object");
}

/** Unattached entries to display under the current verbosity. */
function unattachedToShow(
  ontology: OntologyDetailed,
  showProperties: boolean,
): readonly OntologyProperty[] {
  return inlineProperties(ontology.unattached, showProperties);
}

/** One class's inline property summary: `tier →ds:Tier, …(+2 more)`. */
function inlineProps(
  props: readonly OntologyProperty[],
  showProperties: boolean,
  max = 4,
): string {
  const shown = inlineProperties(props, showProperties);
  if (shown.length === 0) return "";
  const rendered = shown.slice(0, max).map((p) => propLine(p, showProperties));
  const extra = shown.length - max;
  return ` — ${rendered.join(", ")}${extra > 0 ? `, …(+${extra} more)` : ""}`;
}

function propLine(p: OntologyProperty, showProperties: boolean): string {
  const range =
    p.kind === "object" && p.range
      ? ` →${p.range}`
      : showProperties && p.range
        ? `: ${p.range}`
        : "";
  return `${p.label}${range}`;
}

function classSuffix(node: ClassTreeNode): string {
  const count = node.cls.instances ? ` (${node.cls.instances})` : "";
  const also =
    node.alsoExtends.length > 0
      ? ` [also extends ${node.alsoExtends.join(", ")}]`
      : "";
  return `${count}${also}`;
}

// ---------------------------------------------------------------------------
// Tree renderers (both derive from the same buildClassTree forest)
// ---------------------------------------------------------------------------

function renderTreePlain(
  node: ClassTreeNode,
  prefix: string,
  childIndent: string,
  showProperties: boolean,
  lines: string[],
): void {
  const suffix = chalk.dim(
    `${classSuffix(node)}${inlineProps(node.cls.properties, showProperties)}`,
  );
  lines.push(`${prefix}${chalk.bold(node.cls.label)}${suffix}`);

  node.children.forEach((child, i) => {
    const last = i === node.children.length - 1;
    renderTreePlain(
      child,
      `${childIndent}${last ? "└─ " : "├─ "}`,
      `${childIndent}${last ? "   " : "│  "}`,
      showProperties,
      lines,
    );
  });
}

function renderTreeLlm(
  node: ClassTreeNode,
  depth: number,
  showProperties: boolean,
  lines: string[],
): void {
  const pad = "  ".repeat(depth);
  lines.push(
    `${pad}${node.cls.iri}${classSuffix(node)}${inlineProps(node.cls.properties, showProperties)}`,
  );
  for (const child of node.children) {
    renderTreeLlm(child, depth + 1, showProperties, lines);
  }
}

// ---------------------------------------------------------------------------
// Focus (per-class deep dive) renderers — always full detail
// ---------------------------------------------------------------------------

function renderFocusPlain(f: OntologyClassFocus): string {
  const lines: string[] = [];

  lines.push(formatHeading(`${f.label} — ${f.iri}`));
  if (f.comment) lines.push(f.comment);
  const chain =
    f.superChain.length > 0 ? f.superChain.join(" < ") : "(root class)";
  lines.push(chalk.dim(`extends: ${chain} · instances: ${f.instances}`));

  pushPropSection(lines, "Relations", relationsOf(f.directProperties));
  pushPropSection(lines, "Attributes", attributesOf(f.directProperties));
  pushPropSection(lines, "Inherited", f.inheritedProperties);
  pushPropSection(lines, "Referenced by", f.referencedBy);

  if (f.subclasses.length > 0) {
    lines.push("");
    lines.push(`${chalk.bold("Subclasses:")} ${f.subclasses.join(", ")}`);
  }

  if (f.sampleInstances.length > 0) {
    lines.push("");
    lines.push(`${chalk.bold("Instances:")} ${f.sampleInstances.join(", ")}`);
  }

  if (f.queries.length > 0) {
    lines.push("");
    lines.push(chalk.bold("Queries:"));
    for (const q of f.queries) {
      lines.push(chalk.dim(`  # ${q.label}`));
      lines.push(`  pragma graph query "${q.sparql}"`);
    }
  }

  return lines.join("\n");
}

function renderFocusLlm(f: OntologyClassFocus): string {
  const lines: string[] = [];

  lines.push(`## ${f.iri} — ${f.label}`);
  if (f.comment) lines.push(f.comment);
  const chain =
    f.superChain.length > 0 ? f.superChain.join(" < ") : "(root class)";
  lines.push(`- extends: ${chain}`);
  lines.push(`- instances: ${f.instances}`);
  if (f.subclasses.length > 0) {
    lines.push(`- subclasses: ${f.subclasses.join(", ")}`);
  }

  const section = (title: string, props: readonly OntologyProperty[]) => {
    if (props.length === 0) return;
    lines.push(`### ${title}`);
    for (const p of props) {
      lines.push(`- ${fullPropLine(p)}`);
    }
  };
  section("Relations", relationsOf(f.directProperties));
  section("Attributes", attributesOf(f.directProperties));
  section("Inherited", f.inheritedProperties);
  section("Referenced by", f.referencedBy);

  if (f.sampleInstances.length > 0) {
    lines.push("### Instances");
    for (const iri of f.sampleInstances) lines.push(`- ${iri}`);
  }

  if (f.queries.length > 0) {
    lines.push("### Queries");
    for (const q of f.queries) {
      lines.push(`- ${q.label}: \`${q.sparql}\``);
    }
  }

  return lines.join("\n");
}

function relationsOf(
  props: readonly OntologyProperty[],
): readonly OntologyProperty[] {
  return props.filter((p) => p.kind === "object");
}

function attributesOf(
  props: readonly OntologyProperty[],
): readonly OntologyProperty[] {
  return props.filter((p) => p.kind === "datatype");
}

function pushPropSection(
  lines: string[],
  title: string,
  props: readonly OntologyProperty[],
): void {
  if (props.length === 0) return;
  lines.push("");
  lines.push(chalk.bold(`${title}:`));
  for (const p of props) {
    lines.push(`  ${fullPropLine(p)}`);
  }
}

function fullPropLine(p: OntologyProperty): string {
  const range = p.range ? ` → ${p.range}` : "";
  const from = p.domain ? ` (on ${p.domain})` : "";
  const functional = p.functional ? " [functional]" : "";
  return `${p.iri} (${p.kind})${range}${from}${functional}`;
}
