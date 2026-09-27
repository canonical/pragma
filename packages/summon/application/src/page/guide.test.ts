import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dryRun, sequence_ } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generator as domainGenerator } from "../domain/index.js";
import { generator } from "./index.js";

const packageDir = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(import.meta.url);

/** The page the generator writes and the guide it prints, from a dry run. */
function generated(domain: string, name: string) {
  const { effects } = dryRun(
    sequence_([
      domainGenerator.generate({ domainName: domain }),
      generator.generate({ pagePath: `${domain}/${name}` }),
    ]),
  );
  const page = effects.findLast((e) => e._tag === "WriteFile");
  const guide = effects.findLast((e) => e._tag === "Log");
  if (page?._tag !== "WriteFile" || guide?._tag !== "Log") {
    throw new Error("no page written or no guide printed");
  }
  return { page: page.content, guide: guide.message };
}

/**
 * The code lines the guide prints under a heading, as a reader copies them:
 * the indented lines that follow it, without their two-space indent.
 */
function block(guide: string, heading: string): string[] {
  const lines = guide.split("\n");
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) throw new Error(`no "${heading}" in the guide`);
  const code: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("  ")) break;
    code.push(line.slice(2));
  }
  return code;
}

describe("the printed routing guide", () => {
  it("prints the import, the static and :param examples, and the wiring", () => {
    const { guide } = generated("invoices", "detail");

    expect(
      guide,
    ).toBe(`Created src/domains/invoices/DetailPage.tsx. Nothing else was changed; route the page by hand.

In src/domains/invoices/routes.ts, import the page:
  import DetailPage from "./DetailPage.js";

Then add one entry to its routes object. The urls are examples to adapt.

A static url:
  detail: route({ url: "/invoices/detail", content: DetailPage }),

A url with a :param segment; the page takes the params it declares:
  detail: route({ url: "/invoices/:id", content: DetailPage }),
  // DetailPage.tsx
  import type { RouteContentProps, RouteParams } from "@canonical/router-core";
  export default function DetailPage({
    params,
  }: RouteContentProps<RouteParams<"/invoices/:id">>): ReactElement {

Typed search parameters: add \`search: <a Standard Schema>\` to the route and read \`search\` in the page.

In src/routes.tsx, put the route in a group() and list it in appRoutes:
  import invoicesRoutes from "#domains/invoices/routes.js";
  const [detail] = group(/* your wrapper() */, [invoicesRoutes.detail] as const);
  const appRoutes = { /* …the routes already listed */ detail } as const;`);
  });

  /**
   * The examples are text, so nothing else would notice when the router's API
   * moves under them. Paste the static and the :param example into a small
   * app, exactly as a reader would copy them from the printed guide, and
   * type-check it against the real router-core and react-head.
   */
  it("type-checks the static and :param examples pasted into an app", () => {
    const cacheDir = path.join(packageDir, "node_modules", ".cache");
    mkdirSync(cacheDir, { recursive: true });
    // Under the package's node_modules so the fixture resolves the package's
    // own @canonical/router-core, @canonical/react-head and @types/react.
    const root = mkdtempSync(path.join(cacheDir, "summon-page-"));

    try {
      const write = (file: string, content: string) => {
        mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        writeFileSync(path.join(root, file), content);
      };

      write(
        "package.json",
        JSON.stringify({
          type: "module",
          imports: { "#domains/*": "./src/domains/*" },
        }),
      );
      write(
        "tsconfig.json",
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            jsx: "react-jsx",
            target: "esnext",
            module: "nodenext",
            moduleResolution: "nodenext",
            lib: ["esnext", "dom"],
            types: [],
          },
          include: ["src"],
        }),
      );

      // One domain per example, so each is pasted on its own.
      const cases = [
        { domain: "invoices", name: "detail", heading: "A static url:" },
        {
          domain: "orders",
          name: "order-lines",
          heading: "A url with a :param segment",
          // The page reads the params it takes.
          reads: ["void params.id;"],
        },
      ];

      for (const { domain, name, heading, reads = [] } of cases) {
        const { page, guide } = generated(domain, name);
        const [entry, , ...pageLines] = block(guide, heading);
        const [pageImport] = block(guide, `In src/domains/${domain}/routes.ts`);
        const wiring = block(guide, "In src/routes.tsx");

        // The page, with the example's imports and signature pasted in.
        const lines = page.split("\n");
        const imports = pageLines.filter((line) => line.startsWith("import "));
        const signature = pageLines.filter((l) => !l.startsWith("import "));
        if (signature.length > 0) {
          const at = lines.findIndex((l) => l.startsWith("export default"));
          lines.splice(at, 1, ...signature, ...reads.map((r) => `  ${r}`));
        }
        const reactImport = lines.indexOf(
          'import type { ReactElement } from "react";',
        );
        lines.splice(reactImport + 1, 0, ...imports);
        const pageName = /import (\w+) from/.exec(pageImport ?? "")?.[1];
        write(`src/domains/${domain}/${pageName}.tsx`, lines.join("\n"));

        write(
          `src/domains/${domain}/routes.ts`,
          [
            'import { route } from "@canonical/router-core";',
            pageImport,
            "const routes = {",
            entry,
            "} as const;",
            "export default routes;",
            "",
          ].join("\n"),
        );
        const key = /const \[(\w+)\]/.exec(wiring[1] ?? "")?.[1];
        write(
          `src/routes.${domain}.tsx`,
          [
            'import { type AnyRoute, group, wrapper } from "@canonical/router-core";',
            "const publicLayout = wrapper({",
            '  id: "public-layout",',
            "  component: ({ children }) => children,",
            "});",
            // The wrapper comment stands for the app's own; here, the one above.
            ...wiring.map((line) =>
              line.replace("/* your wrapper() */", "publicLayout"),
            ),
            // The page's route is reachable through appRoutes.
            `export const wired: AnyRoute = appRoutes.${key};`,
            "export type AppRoutes = typeof appRoutes;",
            "",
          ].join("\n"),
        );
      }

      const result = spawnSync(
        process.execPath,
        [require.resolve("typescript/bin/tsc"), "-p", root],
        { encoding: "utf8" },
      );
      expect(result.stdout + result.stderr).toBe("");
      expect(result.status).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30_000);
});
