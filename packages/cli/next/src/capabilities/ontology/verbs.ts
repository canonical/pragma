/**
 * `ontology list` and `ontology show <prefix>` — schema (TBox) inspection.
 *
 * `list` groups loaded namespaces by prefix with class/property counts; `show`
 * renders a namespace's class hierarchy (with per-class instance counts read
 * from the pack index) and, with `--properties` or a `--class` focus, its
 * properties. `--full-uris` shows absolute IRIs; `--class <name>` narrows to one
 * class and the properties whose domain is that class.
 */

import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  listNamespaces,
  localName,
  type OntologyShowData,
  type OntologySummary,
  queryClasses,
  queryProperties,
} from "./queries.js";
import { ontologyListFormatters, ontologyShowFormatters } from "./render.js";

/** Resolve a prefix (`ds`) or full namespace URI to the `{ prefix, namespace }` pair. */
function resolvePrefix(
  input: string,
  prefixes: Readonly<Record<string, string>>,
): { prefix: string; namespace: string } {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const entry = Object.entries(prefixes).find(([, ns]) => ns === input);
    if (entry) return { prefix: entry[0], namespace: entry[1] };
    throw PragmaError.invalidInput("namespace", input, {
      validOptions: Object.values(prefixes),
      recovery: {
        message: "List loaded ontology namespaces.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }
  const namespace = prefixes[input];
  if (namespace === undefined) {
    throw PragmaError.invalidInput("prefix", input, {
      validOptions: Object.keys(prefixes),
      recovery: {
        message: "List loaded ontologies.",
        cli: "pragma ontology list",
        mcp: { tool: "ontology_list" },
      },
    });
  }
  return { prefix: input, namespace };
}

const listVerb: VerbSpec<Record<string, unknown>, OntologySummary[]> = {
  path: ["ontology", "list"],
  summary: "List loaded ontology namespaces with class and property counts.",
  params: [],
  output: { formatters: ontologyListFormatters },
  examples: [{ cmd: "pragma ontology list" }],
  capability: {
    needsStore: true,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: async (_params: Record<string, unknown>, rt: PragmaRuntime) => {
    const session = await rt.store.get();
    return listNamespaces(rt, session.prefixes);
  },
};

const showVerb: VerbSpec<Record<string, unknown>, OntologyShowData> = {
  path: ["ontology", "show"],
  summary: "Show a namespace's classes (hierarchy + counts) and properties.",
  params: [
    {
      kind: "string",
      name: "prefix",
      doc: "The namespace prefix (ds) or full URI.",
      positional: true,
      required: true,
      complete: { kind: "names", source: { from: "prefixes" } },
    },
    {
      kind: "boolean",
      name: "properties",
      doc: "Include the properties section.",
    },
    {
      kind: "boolean",
      name: "fullUris",
      doc: "Show full IRIs instead of prefixed.",
    },
    {
      kind: "string",
      name: "class",
      doc: "Focus on one class and its properties.",
    },
  ],
  output: { formatters: ontologyShowFormatters },
  examples: [
    { cmd: "pragma ontology show ds" },
    { cmd: "pragma ontology show ds --properties" },
    { cmd: "pragma ontology show ds --class Component" },
  ],
  capability: {
    needsStore: true,
    mutates: false,
    mcp: {
      expose: true,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
  },
  run: async (params: Record<string, unknown>, rt: PragmaRuntime) => {
    const session = await rt.store.get();
    const { prefix, namespace } = resolvePrefix(
      String(params.prefix),
      session.prefixes,
    );
    const focus = typeof params.class === "string" ? params.class : undefined;
    const wantProperties = params.properties === true || focus !== undefined;

    let classes = await queryClasses(
      rt,
      namespace,
      session.index.instanceCountByType,
    );
    let properties = wantProperties ? await queryProperties(rt, namespace) : [];

    if (focus !== undefined) {
      const needle = focus.toLowerCase();
      classes = classes.filter(
        (c) =>
          localName(c.uri).toLowerCase() === needle ||
          c.label.toLowerCase() === needle,
      );
      const focusUris = new Set(classes.map((c) => c.uri));
      properties = properties.filter(
        (p) => p.domain !== undefined && focusUris.has(p.domain),
      );
    }

    if (classes.length === 0 && properties.length === 0) {
      throw PragmaError.notFound("ontology", String(params.prefix), {
        recovery: {
          message: "List loaded ontologies.",
          cli: "pragma ontology list",
          mcp: { tool: "ontology_list" },
        },
      });
    }

    return {
      prefix,
      namespace,
      classes,
      properties,
      fullUris: params.fullUris === true,
      ...(focus !== undefined ? { focus } : {}),
    };
  },
};

/** The `ontology` verbs (`list`, `show`). */
export const ontologyListVerb = asVerb(listVerb);
export const ontologyShowVerb = asVerb(showVerb);
