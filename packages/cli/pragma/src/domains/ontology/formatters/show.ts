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
 * Formatters for `pragma ontology show` output.
 *
 * All three modes are projections of the same {@link OntologyDetailed}
 * structure — they may style differently, but every fact they print comes
 * from that one shape, and the hierarchy is derived through the single
 * shared {@link buildClassTree} helper so it can never diverge between
 * output modes.
 *
 * - **plain**: chalk-styled header, class hierarchy tree with inline
 *   properties and instance counts, unattached properties, constraints,
 *   and a next-command footer. Renders the class deep dive when `focus`
 *   is present.
 * - **llm**: the same content as condensed Markdown.
 * - **json**: the {@link OntologyDetailed} structure itself.
 */
const formatters: Formatters<OntologyDetailed> = {
  plain(data) {
    if (data.focus) return renderFocusPlain(data.focus);

    const lines: string[] = [];
    lines.push(formatHeading(`Ontology ${data.prefix}: — ${data.namespace}`));
    lines.push(chalk.dim(summaryLine(data)));

    if (data.classes.length > 0) {
      lines.push("");
      for (const root of buildClassTree(data.classes)) {
        renderTreePlain(root, "", "", lines);
      }
    }

    if (data.unattached.length > 0) {
      lines.push("");
      lines.push(
        `${chalk.bold("Unattached:")} ${data.unattached
          .map((p) => p.label)
          .join(", ")}`,
      );
    }

    if (data.constraints && data.constraints.length > 0) {
      lines.push("");
      lines.push(chalk.bold("Constraints:"));
      for (const c of data.constraints) {
        const target = c.targetClass ? ` on ${c.targetClass}` : "";
        lines.push(
          `  ${c.shape}${target} ${chalk.dim(
            `(${c.propertyCount} property constraints)`,
          )}`,
        );
      }
    }

    lines.push("");
    lines.push(
      chalk.dim(
        `Next: pragma ontology show ${data.prefix} --class <Class> · pragma graph inspect <iri>`,
      ),
    );

    return lines.join("\n");
  },

  llm(data) {
    if (data.focus) return renderFocusLlm(data.focus);

    const lines: string[] = [];
    lines.push(`## Ontology ${data.prefix}: — ${data.namespace}`);
    lines.push(summaryLine(data));
    lines.push("");

    if (data.classes.length > 0) {
      lines.push("### Classes");
      lines.push("```");
      for (const root of buildClassTree(data.classes)) {
        renderTreeLlm(root, 0, lines);
      }
      lines.push("```");
    }

    if (data.unattached.length > 0) {
      lines.push(
        `Unattached: ${data.unattached.map((p) => propLine(p)).join(", ")}`,
      );
    }

    if (data.constraints && data.constraints.length > 0) {
      lines.push("### Constraints");
      for (const c of data.constraints) {
        const target = c.targetClass ? ` targets ${c.targetClass}` : "";
        lines.push(`- ${c.shape}${target} (${c.propertyCount} constraints)`);
      }
    }

    lines.push("");
    lines.push(
      `Next: \`ontology show ${data.prefix} --class <Class>\` for one class in depth.`,
    );

    return lines.join("\n");
  },

  json(data) {
    return JSON.stringify(data, null, 2);
  },
};

export default formatters;

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------

function summaryLine(data: OntologyDetailed): string {
  const propertyCount =
    data.classes.reduce((n, c) => n + c.properties.length, 0) +
    data.unattached.length;
  const parts = [
    `${data.classes.length} classes`,
    `${propertyCount} properties`,
  ];
  if (data.constraints?.length) parts.push(`${data.constraints.length} shapes`);
  if (data.meta?.version) parts.push(`v${data.meta.version}`);
  if (data.meta?.title) parts.push(data.meta.title);
  return parts.join(" · ");
}

/** One class's inline property summary: `name, tier →ds:Tier, …(+2 more)`. */
function inlineProps(props: readonly OntologyProperty[], max = 4): string {
  if (props.length === 0) return "";
  const shown = props.slice(0, max).map(propLine);
  const extra = props.length - max;
  return ` — ${shown.join(", ")}${extra > 0 ? `, …(+${extra} more)` : ""}`;
}

function propLine(p: OntologyProperty): string {
  const range = p.kind === "object" && p.range ? ` →${p.range}` : "";
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
  lines: string[],
): void {
  const suffix = chalk.dim(
    `${classSuffix(node)}${inlineProps(node.cls.properties)}`,
  );
  lines.push(`${prefix}${chalk.bold(node.cls.label)}${suffix}`);

  node.children.forEach((child, i) => {
    const last = i === node.children.length - 1;
    renderTreePlain(
      child,
      `${childIndent}${last ? "└─ " : "├─ "}`,
      `${childIndent}${last ? "   " : "│  "}`,
      lines,
    );
  });
}

function renderTreeLlm(
  node: ClassTreeNode,
  depth: number,
  lines: string[],
): void {
  const pad = "  ".repeat(depth);
  lines.push(
    `${pad}${node.cls.iri}${classSuffix(node)}${inlineProps(node.cls.properties)}`,
  );
  for (const child of node.children) renderTreeLlm(child, depth + 1, lines);
}

// ---------------------------------------------------------------------------
// Focus (per-class deep dive) renderers
// ---------------------------------------------------------------------------

function renderFocusPlain(f: OntologyClassFocus): string {
  const lines: string[] = [];

  lines.push(formatHeading(`${f.label} — ${f.iri}`));
  if (f.comment) lines.push(f.comment);
  const chain =
    f.superChain.length > 0 ? f.superChain.join(" < ") : "(root class)";
  lines.push(chalk.dim(`extends: ${chain} · instances: ${f.instances}`));

  pushPropSection(lines, "Properties", f.directProperties);
  pushPropSection(lines, "Inherited", f.inheritedProperties);
  pushPropSection(lines, "Referenced by", f.referencedBy);

  if (f.subclasses.length > 0) {
    lines.push("");
    lines.push(`${chalk.bold("Subclasses:")} ${f.subclasses.join(", ")}`);
  }

  if (f.sampleInstances.length > 0) {
    lines.push("");
    lines.push(`${chalk.bold("Instances:")} ${f.sampleInstances.join(", ")}`);
    lines.push(chalk.dim(`Next: pragma graph inspect ${f.sampleInstances[0]}`));
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
  section("Properties", f.directProperties);
  section("Inherited", f.inheritedProperties);
  section("Referenced by", f.referencedBy);

  if (f.sampleInstances.length > 0) {
    lines.push("### Instances");
    for (const iri of f.sampleInstances) lines.push(`- ${iri}`);
  }

  return lines.join("\n");
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
