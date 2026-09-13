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
  /** The slice the provider starts on, as source text. */
  readonly slice?: string | undefined;
  /** The window the provider starts on, as source text. */
  readonly window?: string | undefined;
  /** Commands issued once the provider is built, as source text. */
  readonly prepare?: string | undefined;
  /** Give the provider the browser's saved-view store. */
  readonly views?: boolean | undefined;
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

/** The application's saved-view store, declared once beside the collection. */
const viewStore = `// One store per collection, for as long as the application runs. On a
// server \`globalThis.indexedDB\` is undefined and nothing reads it: the
// store is first read when the provider is first observed, in the browser.
const views = createIndexedDBViewStore({
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
  slice,
  window,
  prepare,
  views,
  location,
}: Pick<
  ConsumerCode,
  "source" | "slice" | "window" | "prepare" | "views" | "location"
>): string => {
  const commands =
    prepare === undefined
      ? ""
      : `\n${indent(prepare, 4)}\n    return provider;`;
  // A window alone fits on the seed's line; a slice gets a line of its own.
  const seed =
    slice === undefined
      ? window === undefined
        ? []
        : [`seed: { window: ${window} },`]
      : [
          `seed: {
  slice: ${slice},${window === undefined ? "" : `\n  window: ${window},`}
},`,
        ];
  const config = [
    "collection: machineCollection,",
    `source: ${source},`,
    ...(location === undefined ? [] : [`location: ${location},`]),
    ...(views === true ? ["views,"] : []),
    ...seed,
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
  slice,
  window,
  prepare,
  views = false,
  location,
  hooks = [],
  render,
}: ConsumerCode) => {
  // A window is built from the package's default one, so whichever block
  // spells it out pulls the import in.
  const blocks = [slice, window, prepare, declarations, render];
  const usesDefaultWindow = blocks.some(
    (block) => block?.includes("DEFAULT_WINDOW") === true,
  );
  const usesEmptySlice = blocks.some(
    (block) => block?.includes("EMPTY_SLICE") === true,
  );
  const core = [
    ...(source.includes("createArraySource(") ? ["createArraySource"] : []),
    "createDataViewsProvider",
    ...coreFunctions,
    ...(usesDefaultWindow ? ["DEFAULT_WINDOW"] : []),
    ...(usesEmptySlice ? ["EMPTY_SLICE"] : []),
    ...coreTypes.map((name) => `type ${name}`),
  ];
  return {
    docs: {
      source: {
        language: "tsx",
        code: [
          `import {
${core.map((name) => `  ${name},`).join("\n")}
} from "@canonical/dataviews-core";${views ? `\nimport { createIndexedDBViewStore } from "@canonical/dataviews-core/indexeddb";` : ""}
import { ${parts.join(", ")} } from "@canonical/dataviews-react";
import { ${["useState", ...hooks].join(", ")} } from "react";
${imports ?? `import { machineCollection, machines } from "./machines.js";`}`,
          views ? viewStore : undefined,
          declarations,
          `export function Machines() {
${providerState({ source, slice, window, prepare, views, location })}
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
