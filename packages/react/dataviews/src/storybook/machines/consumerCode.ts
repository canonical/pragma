/**
 * A story's consumer code, as its "Show code" panel shows it: one component
 * an application could paste, wired the way an application wires one — the
 * collection declared at module scope, a provider built once over it, its
 * source and its ports, and the parts mounted. Nothing is wired in an
 * effect: the parts observe the provider, and that starts everything.
 * Story-only.
 */

type ConsumerCode = {
  /** Named imports from `@canonical/dataviews-react`. */
  readonly parts: readonly string[];
  /** Functions from `@canonical/dataviews-core` the declarations use. */
  readonly core?: readonly string[] | undefined;
  /** Types from `@canonical/dataviews-core` the declarations use. */
  readonly coreTypes?: readonly string[] | undefined;
  /** Further import lines, in place of the machines module's default one. */
  readonly imports?: string | undefined;
  /** Module-level code: columns, custom children. */
  readonly declarations?: string | undefined;
  /** The source, as source text; the machines over a local array by default. */
  readonly source?: string | undefined;
  /** The query the provider starts on, as the canonical text its snapshot carries. */
  readonly query?: string | undefined;
  /** Commands issued once the provider is built, as source text. */
  readonly prepare?: string | undefined;
  /** Give the provider the browser's store, as `views` and `presentation`. */
  readonly store?: boolean | undefined;
  /** Give the provider a location, as source text. */
  readonly location?: string | undefined;
  /** React hooks the declarations use beyond `useState`. */
  readonly hooks?: readonly string[] | undefined;
  /** What the component renders, as JSX source text. */
  readonly render: string;
};

// Spelled relative to the `source:` line it follows; the provider block
// indents it into place.
const machineSource = `createArraySource({
  rows: machines,
  collection: machineCollection,
  searchFields: ["name", "owner"],
})`;

/** The application's store, declared once beside the collection. */
const viewStore = `// One store per collection, for as long as the application runs, serving
// the saved views and the viewer's arrangement alike. On a server
// \`globalThis.indexedDB\` is undefined and nothing reads it: the store is
// first read when the provider is first observed, in the browser.
const store = createIndexedDBViewStore({
  indexedDB: globalThis.indexedDB,
  database: "operations-console-views",
  collection: "machines",
  partition: null,
});`;

const indent = (text: string, depth: number): string =>
  text
    .split("\n")
    .map((line) => (line === "" ? line : `${" ".repeat(depth)}${line}`))
    .join("\n");

/** The provider, built once in state, with the commands issued once it is. */
const providerState = ({
  source,
  query,
  prepare,
  store,
  location,
}: Pick<
  ConsumerCode,
  "source" | "query" | "prepare" | "store" | "location"
>): string => {
  const commands =
    prepare === undefined
      ? ""
      : `\n${indent(prepare, 4)}\n    return provider;`;
  const snapshot =
    query === undefined
      ? []
      : [`snapshot: { query: ${JSON.stringify(query)}, presentation: {} },`];
  const config = [
    "collection: machineCollection,",
    `source: ${source},`,
    ...(location === undefined ? [] : [`location: ${location},`]),
    ...(store === true ? ["views: store,", "presentation: store,"] : []),
    ...snapshot,
  ];
  const built = `createDataViewsProvider({
${config.map((line) => indent(line, 6)).join("\n")}
    })`;
  return prepare === undefined
    ? `  // Built once: the parts observe it, which starts its source and ports.
  const [provider] = useState(() =>
    ${built},
  );`
    : `  // Built once: the parts observe it, which starts its source and ports.
  const [provider] = useState(() => {
    const provider = ${built};${commands}
  });`;
};

/** The story parameters that show the consumer code for one story. */
export const consumerCode = ({
  parts,
  core: coreFunctions = [],
  coreTypes = [],
  imports,
  declarations,
  source = machineSource,
  query,
  prepare,
  store = false,
  location,
  hooks = [],
  render,
}: ConsumerCode) => {
  const core = [
    ...(source.includes("createArraySource(") ? ["createArraySource"] : []),
    "createDataViewsProvider",
    ...coreFunctions,
    ...coreTypes.map((name) => `type ${name}`),
  ];
  return {
    docs: {
      source: {
        language: "tsx",
        code: [
          `import {
${core.map((name) => `  ${name},`).join("\n")}
} from "@canonical/dataviews-core";${store ? `\nimport { createIndexedDBViewStore } from "@canonical/dataviews-core/indexeddb";` : ""}
import { ${parts.join(", ")} } from "@canonical/dataviews-react";
import { ${["useState", ...hooks].join(", ")} } from "react";
${imports ?? `import { machineCollection, machines } from "./machines.js";`}`,
          store ? viewStore : undefined,
          declarations,
          `export function Machines() {
${providerState({ source, query, prepare, store, location })}
  return (
${indent(render, 4)}
  );
}`,
        ]
          .filter((block) => block !== undefined)
          .join("\n\n"),
      },
    },
  };
};
