// @vitest-environment node
/**
 * Bundle isolation, read from the output module graph of consumer bundles:
 * one rendering DataTable without virtualization ships no part of the
 * virtualization and none of the composition, one importing the
 * virtualization ships the implementation over a single copy of the core
 * both share, and the virtualized body loads no part of the table it is
 * rendered into. React and the design system's own packages stay external;
 * the DataViews core is bundled, so its modules are in the graph to be
 * counted.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { describe, expect, it } from "vitest";

/** The library folder, two levels up from `src/testing/integration`. */
const lib = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../lib",
);

type Output = {
  readonly output: readonly (
    | { readonly type: "chunk"; readonly moduleIds: readonly string[] }
    | {
        readonly type: "asset";
        readonly fileName: string;
        readonly source: string | Uint8Array;
      }
  )[];
};

/** Bundle one consumer module; return its module graph and its CSS. */
const bundle = async (
  source: string,
): Promise<{ readonly modules: string[]; readonly css: string }> => {
  const result = (await build({
    configFile: false,
    logLevel: "silent",
    root: path.dirname(path.dirname(lib)),
    plugins: [
      {
        name: "consumer",
        resolveId: (id) => (id === "consumer" ? "\0consumer" : null),
        load: (id) => (id === "\0consumer" ? source : null),
      },
    ],
    build: {
      write: false,
      minify: false,
      rolldownOptions: {
        input: "consumer",
        // An application build drops its entry's exports, and with them
        // everything but side effects: keep them, as a consumer's use would.
        preserveEntrySignatures: "strict",
        external: (id) =>
          /^(react|react-dom)(\/|$)/.test(id) ||
          /^@canonical\/(?!dataviews-core)/.test(id),
      },
    },
  })) as Output | Output[];
  const files = (Array.isArray(result) ? result : [result]).flatMap(
    (output) => output.output,
  );
  return {
    modules: files.flatMap((file) =>
      file.type === "chunk" ? file.moduleIds : [],
    ),
    css: files
      .flatMap((file) =>
        file.type === "asset" && file.fileName.endsWith(".css")
          ? [String(file.source)]
          : [],
      )
      .join(""),
  };
};

const from = (module: string): string => JSON.stringify(path.join(lib, module));

describe("bundle isolation", () => {
  it("stands the table alone: no virtualization, no composition", async () => {
    const { modules, css } = await bundle(
      `export { DataTable } from ${from("index.ts")};`,
    );
    // The table's own graph is there, down to the core modules it runs on.
    expect(modules.some((id) => id.endsWith("DataTable.tsx"))).toBe(true);
    expect(modules.some((id) => id.endsWith("/rows/createRowScopes.js"))).toBe(
      true,
    );
    // The key a descriptor is read by is the table's; the implementation
    // behind it, and the core's range, are not.
    expect(
      modules.filter(
        (id) =>
          id.includes("/virtualization/") &&
          !id.endsWith("/common/virtualization/constants.ts"),
      ),
    ).toEqual([]);
    // The standalone table is an adoption boundary of its own: a consumer
    // who never mounts a DataViews root ships no root, no connected part
    // and no context, only the table, the shared hooks and the core.
    expect(modules.filter((id) => id.includes("/DataViews/"))).toEqual([]);
    expect(modules.filter((id) => id.includes("/PaginationBar/"))).toEqual([]);
    expect(css).toContain("data-table");
    expect(css).not.toContain("virtual");
  }, 60_000);

  it("ships no mock endpoint, query client or story code from the root", async () => {
    const { modules } = await bundle(`export * from ${from("index.ts")};`);
    // An application brings its own client, and nothing here ships one.
    expect(
      modules.filter((id) =>
        /\/node_modules\/(\.bun\/[^/]+\/node_modules\/)?(msw|@tanstack|relay-runtime|graphql)\/|\/src\/storybook\/|\/testing\//.test(
          id,
        ),
      ),
    ).toEqual([]);
  }, 60_000);

  it("loads the body without the table it is rendered into", async () => {
    // The entry point is named for its bytes: what it adds to a table is
    // the body, and a table's own graph is the table's to load.
    const { modules } = await bundle(
      `export { virtualizeRows } from ${from("virtualization/index.ts")};`,
    );
    expect(modules.some((id) => id.endsWith("VirtualBody.tsx"))).toBe(true);
    // Nothing of the table's own folder: the body renders rows through the
    // renderer the table hands it, so it knows no row of its own.
    expect(modules.filter((id) => id.includes("/DataTable/"))).toEqual([]);
  }, 60_000);

  it("ships the implementation over one copy of the shared core", async () => {
    const { modules, css } = await bundle(
      `export { DataTable } from ${from("index.ts")};
export { virtualizeRows } from ${from("virtualization/index.ts")};`,
    );
    expect(modules.some((id) => id.endsWith("VirtualBody.tsx"))).toBe(true);
    expect(
      modules.filter((id) => id.endsWith("/createVirtualRange.js")),
    ).toHaveLength(1);
    expect(
      modules.filter((id) => id.endsWith("/observable/createChannel.js")),
    ).toHaveLength(1);
    // The core arrives one way only: as its built package.
    expect(
      modules.filter((id) => id.includes("/runtime/dataviews/src/")),
    ).toEqual([]);
    expect(css).toContain("virtual");
  }, 60_000);
});
