/**
 * `ontology list` and `ontology lookup <prefix>` — schema (TBox) inspection.
 *
 * `list` groups loaded namespaces by prefix with class/property counts; `lookup`
 * renders a namespace's class hierarchy (with per-class instance counts read
 * from the pack index) and, with `--properties`, a `--class` focus, or a
 * `--detail` of `standard`+, its properties. `--full-uris` shows absolute IRIs;
 * `--class <name>` narrows to one class and the properties whose domain is that
 * class.
 *
 * There were TWO by-name verbs here. `ontology show` was a self-declared
 * deprecated alias of `ontology lookup` (AV-228 B1) with the same params, the
 * same disclosure, the same formatters and a reference to the same handler; its
 * own test asserted the two produced identical output. It is gone, and with it
 * the `byNameVerb` factory and the three constants that existed only so two
 * verbs could share them — all three are now inlined at the single use.
 *
 * Disclosure (B5): rather than reinvent its own scheme, the by-name read declares
 * the canonical disclosure ladder and honours the `--detail`/config `detail` the
 * rest of the CLI reads AND the injected `detail` tool param the MCP projector
 * derives from that declaration — a two-behaviour fold where `summary` is
 * classes-only and `standard`/`detailed` add the properties section. The frozen
 * `--properties` flag stays as an explicit override (it forces the section at
 * any level), so the covenant is untouched.
 */

import { BIN_NAME } from "../../constants.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";
import { cliRecovery } from "../../kernel/error/recovery.js";
import { resolvePackDetail } from "../../kernel/packs/disclosure.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type {
  DisclosureSpec,
  ParamSpec,
  VerbSpec,
} from "../../kernel/spec/types.js";
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
      recovery: cliRecovery(
        "ontology list",
        "List loaded ontology namespaces.",
        {
          tool: "ontology_list",
        },
      ),
    });
  }
  const namespace = prefixes[input];
  if (namespace === undefined) {
    throw PragmaError.invalidInput("prefix", input, {
      validOptions: Object.keys(prefixes),
      recovery: cliRecovery("ontology list", "List loaded ontologies.", {
        tool: "ontology_list",
      }),
    });
  }
  return { prefix: input, namespace };
}

const listVerb: VerbSpec<Record<string, unknown>, OntologySummary[]> = {
  path: ["ontology", "list"],
  summary: "List loaded ontology namespaces with class and property counts.",
  params: [],
  output: { formatters: ontologyListFormatters },
  examples: [{ cmd: `${BIN_NAME} ontology list` }],
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

/**
 * The canonical disclosure `ontology lookup` folds onto (B5). Declared on the
 * verb — so the MCP projector injects the `detail` enum tool param and its
 * per-call `withDetail` seeding light up (symmetric with `block`/`standard`,
 * which an inline resolve left dark over MCP) — AND read by `run` to resolve the
 * effective level, so the advertised param and the fetched level share ONE
 * source. It stays a named constant rather than an inline literal for exactly
 * that reason: two readers, one declaration. The levels are the full canonical
 * ladder; the fold is two-behaviour (`summary` = classes only,
 * `standard`/`detailed` add properties).
 */
const LOOKUP_DISCLOSURE: DisclosureSpec = {
  levels: ["summary", "standard", "detailed"],
  default: "summary",
};

/** The `ontology lookup` params. */
const LOOKUP_PARAMS: ParamSpec[] = [
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
    doc: "Include the properties section (also implied by --detail standard or higher).",
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
];

/** The `ontology lookup` capability — a store-backed, read-only MCP tool. */
const LOOKUP_CAPABILITY = {
  needsStore: true,
  mutates: false,
  mcp: {
    expose: true as const,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
};

/**
 * The `ontology lookup` handler.
 *
 * @param params - The coerced param bag (`prefix`, `properties`, `fullUris`, `class`).
 * @param rt - The runtime (store + disclosure precedence).
 * @returns The namespace's classes (and, per disclosure, properties) payload.
 */
async function runLookup(
  params: Record<string, unknown>,
  rt: PragmaRuntime,
): Promise<OntologyShowData> {
  const session = await rt.store.get();
  const { prefix, namespace } = resolvePrefix(
    String(params.prefix),
    session.prefixes,
  );
  const focus = typeof params.class === "string" ? params.class : undefined;
  // Fold ontology's bespoke disclosure onto the canonical `--detail` (B5),
  // resolving through the SAME {@link LOOKUP_DISCLOSURE} the verb declares (so
  // the MCP `detail` param and its withDetail seeding resolve identically, not
  // just the CLI `--detail` flag) and the SAME precedence packs use (flag >
  // explicit config > default). The frozen `--properties` flag and a `--class`
  // focus still force the section, so honouring the level is covenant-safe.
  const level = await resolvePackDetail(rt, LOOKUP_DISCLOSURE);
  const wantProperties =
    params.properties === true || focus !== undefined || level !== "summary";

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
      recovery: cliRecovery("ontology list", "List loaded ontologies.", {
        tool: "ontology_list",
      }),
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
}

/** The `ontology` verbs (`list`, `lookup`). */
export const ontologyListVerb = asVerb(listVerb);

/** `ontology lookup <prefix>` — the by-name schema read. */
export const ontologyLookupVerb = asVerb({
  path: ["ontology", "lookup"],
  summary:
    "Look up a namespace's classes (hierarchy + counts) and properties.",
  params: LOOKUP_PARAMS,
  output: { formatters: ontologyShowFormatters },
  examples: [
    { cmd: `${BIN_NAME} ontology lookup ds` },
    { cmd: `${BIN_NAME} ontology lookup ds --properties` },
    { cmd: `${BIN_NAME} ontology lookup ds --class Component` },
  ],
  disclosure: LOOKUP_DISCLOSURE,
  capability: LOOKUP_CAPABILITY,
  run: runLookup,
} satisfies VerbSpec<Record<string, unknown>, OntologyShowData>);
