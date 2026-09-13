/**
 * A story's consumer code, as its "Show code" panel shows it: one component
 * an application could paste, wired the way an application wires one — the
 * source, a provider told what that source can execute, and the binding
 * built and released in an effect. Story-only.
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
  /** The window the provider starts on, as source text. */
  readonly window?: string | undefined;
  /** Commands issued once the source is bound, as source text. */
  readonly prepare?: string | undefined;
  /** Keep the binding in state, for children that run actions through it. */
  readonly keepsBinding?: boolean | undefined;
  /** Give the provider the browser's saved-view store. */
  readonly views?: boolean | undefined;
  /** React hooks the declarations use beyond `useEffect` and `useState`. */
  readonly hooks?: readonly string[] | undefined;
  /** What the component renders, as JSX source text. */
  readonly render: string;
};

const machineSource = `createArraySource({
      rows: machines,
      schema: machineSchema,
      searchFields: ["name", "owner"],
    })`;

/** The application's saved-view store, declared once beside the collection. */
const viewStore = `// One store per collection, for as long as the application runs. On a
// server \`globalThis.indexedDB\` is undefined and nothing reads it: the
// store is first read when the Views control mounts in the browser.
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

/** The effect binding the source, and the commands issued once it is bound. */
const bindingEffect = (
  prepare: string | undefined,
  keepsBinding: boolean,
): string => {
  const commands = prepare === undefined ? "" : `\n${indent(prepare, 4)}`;
  const firstPage = `
    if (provider.state.get().result.status === "idle") {
      provider.refresh();
    }`;
  return keepsBinding
    ? `  // Observing subscribes, so it lives in an effect that releases it; the
  // binding is kept in state for the actions that run through it.
  const [binding, setBinding] = useState<SourceBinding | null>(null);
  useEffect(() => {
    const bound = createSourceBinding({ host: provider, source });
    const release = bound.observe();
    setBinding(bound);${commands}${firstPage}
    return () => {
      release();
      setBinding(null);
    };
  }, [provider, source]);`
    : `  useEffect(() => {
    // Observing subscribes, so it lives in an effect that releases it.
    const binding = createSourceBinding({ host: provider, source });
    const release = binding.observe();${commands}${firstPage}
    return release;
  }, [provider, source]);`;
};

/** The story parameters that show the consumer code for one story. */
export const consumerCode = ({
  parts,
  core: coreFunctions = [],
  coreTypes = [],
  imports,
  declarations,
  source = machineSource,
  window,
  prepare,
  keepsBinding = false,
  views = false,
  hooks = [],
  render,
}: ConsumerCode) => {
  // A window is built from the package's default one, so whichever block
  // spells it out pulls the import in.
  const usesDefaultWindow = [window, prepare, declarations, render].some(
    (block) => block?.includes("DEFAULT_WINDOW") === true,
  );
  const core = [
    ...(source.includes("createArraySource(") ? ["createArraySource"] : []),
    "createDataViewsProvider",
    ...coreFunctions,
    "createSourceBinding",
    ...(usesDefaultWindow ? ["DEFAULT_WINDOW"] : []),
    ...[...coreTypes, ...(keepsBinding ? ["SourceBinding"] : [])].map(
      (name) => `type ${name}`,
    ),
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
import { ${["useEffect", "useState", ...hooks].join(", ")} } from "react";
${imports ?? `import { machineSchema, machines } from "./machines.js";`}`,
          views ? viewStore : undefined,
          declarations,
          `export function Machines() {
  const [source] = useState(() =>
    ${source},
  );
  const [provider] = useState(() =>
    createDataViewsProvider({
      schema: machineSchema,
      // What the source can execute: the parts offer nothing beyond it.
      capabilities: source.capabilities,${window === undefined ? "" : `\n      window: ${window},`}${views ? "\n      views," : ""}
    }),
  );
${bindingEffect(prepare, keepsBinding)}
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
