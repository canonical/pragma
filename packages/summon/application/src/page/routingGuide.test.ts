import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dryRun, sequence_ } from "@canonical/task";
import { describe, expect, it } from "vitest";
import { generator as domainGenerator } from "../domain/index.js";
import { generator } from "./index.js";
import {
  formatRoutingGuide,
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

/** The generated page with an example's imports and signature pasted in. */
function pastePage(source: string, example: RouteExample): string {
  const imports = example.page.filter((line) => line.startsWith("import "));
  const signature = example.page.filter((line) => !line.startsWith("import "));
  const lines = source.split("\n");
  const reactImport = lines.indexOf(
    'import type { ReactElement } from "react";',
  );
  const declaration = lines.findIndex((line) =>
    line.startsWith("export default function "),
  );
  if (signature.length > 0) lines.splice(declaration, 1, ...signature);
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
      "  const [detail] = group(publicLayout, [invoicesRoutes.detail] as const);",
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

      pages.forEach(([domain, name], index) => {
        const guide = routingGuide(domain, name);
        const example = guide.examples[index];

        write(guide.pageFile, pastePage(generatedPage(domain, name), example));
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
            'import { group, route, wrapper } from "@canonical/router-core";',
            "const publicLayout = wrapper({",
            '  id: "public-layout",',
            "  component: ({ children }) => children,",
            "});",
            'const home = route({ url: "/", content: () => null });',
            ...guide.wiring,
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
  }, 120_000);
});
