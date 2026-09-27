import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dryRun, sequence_ } from "@canonical/task";
import { toCamelCase } from "@canonical/utils";
import { describe, expect, it } from "vitest";
import { generator as domainGenerator } from "../domain/index.js";
import { generator } from "./index.js";
import {
  formatRoutingGuide,
  LAYOUT_PLACEHOLDER,
  type RouteExample,
  routingGuide,
} from "./routingGuide.js";

const packageDir = fileURLToPath(new URL("../..", import.meta.url));
const require = createRequire(import.meta.url);

/** The page the generator writes, from a dry run. */
function generatedPage(domain: string, name: string): string {
  const result = dryRun(
    sequence_([
      domainGenerator.generate({ domainName: domain }),
      generator.generate({ pagePath: `${domain}/${name}` }),
    ]),
  );
  const guide = routingGuide(domain, name);
  const page = result.effects.find(
    (e) => e._tag === "WriteFile" && e.path === guide.pageFile,
  );
  if (page?._tag !== "WriteFile") throw new Error("no page written");
  return page.content;
}

/**
 * The generated page with an example's imports and signature pasted in, and
 * `reads` placed at the top of its body so the page uses the props it takes.
 */
function pastePage(
  source: string,
  example: RouteExample,
  reads: readonly string[],
): string {
  const imports = example.page.filter((line) => line.startsWith("import "));
  const signature = example.page.filter((line) => !line.startsWith("import "));
  const lines = source.split("\n");
  const reactImport = lines.indexOf(
    'import type { ReactElement } from "react";',
  );
  const declaration = lines.findIndex((line) =>
    line.startsWith("export default function "),
  );
  if (signature.length > 0) {
    lines.splice(declaration, 1, ...signature, ...reads.map((r) => `  ${r}`));
  }
  lines.splice(reactImport + 1, 0, ...imports);
  return lines.join("\n");
}

describe("routing guide", () => {
  it("prints the import, the examples and the wiring, compactly", () => {
    const lines = formatRoutingGuide(routingGuide("invoices", "detail"));

    expect(lines).toContain('  import DetailPage from "./DetailPage.js";');
    expect(lines).toContain(
      '  detail: route({ url: "/invoices/detail", content: DetailPage }),',
    );
    expect(lines).toContain(
      '  detail: route({ url: "/invoices/:id", content: DetailPage }),',
    );
    expect(lines).toContain(
      '  }: RouteContentProps<RouteParams<"/invoices/:id">>): ReactElement {',
    );
    expect(lines).toContain(
      "  const [detail] = group(<layout>, [invoicesRoutes.detail] as const);",
    );
    expect(lines).toContain(
      "  const appRoutes = { /* …the routes already listed */ detail } as const;",
    );
    expect(lines.length).toBeLessThanOrEqual(45);
  });

  /**
   * The examples are text, so nothing else would notice when the router's API
   * moves under them. Paste each one into a small app, exactly as a reader
   * would, and type-check it against the real router-core and react-head.
   */
  it("type-checks every example pasted into an app", () => {
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
      const pages = [
        ["invoices", "detail"],
        ["orders", "order-lines"],
        ["reports", "summary"],
      ] as const;

      // What each example's page reads, so a page that takes props uses them.
      const READS: readonly (readonly string[])[] = [
        [],
        ["void params.id;"],
        ["void search.q;"],
      ];

      pages.forEach(([domain, name], index) => {
        const guide = routingGuide(domain, name);
        const example = guide.examples[index];

        write(
          guide.pageFile,
          pastePage(generatedPage(domain, name), example, READS[index] ?? []),
        );
        write(
          guide.routesFile,
          [
            'import { route } from "@canonical/router-core";',
            guide.pageImport,
            ...example.setup,
            "const routes = {",
            example.entry,
            "} as const;",
            "export default routes;",
            "",
          ].join("\n"),
        );
        write(
          `src/routes.${domain}.tsx`,
          [
            'import { type AnyRoute, group, wrapper } from "@canonical/router-core";',
            "const publicLayout = wrapper({",
            '  id: "public-layout",',
            "  component: ({ children }) => children,",
            "});",
            // The placeholder is the app's own wrapper; here, the one above.
            ...guide.wiring.map((line) =>
              line.replace(LAYOUT_PLACEHOLDER, "publicLayout"),
            ),
            // The page's route is reachable through appRoutes.
            `export const wired: AnyRoute = appRoutes.${toCamelCase(name)};`,
            "export type AppRoutes = typeof appRoutes;",
            "",
          ].join("\n"),
        );
      });

      expect(pages.length).toBe(routingGuide("a", "b").examples.length);

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
