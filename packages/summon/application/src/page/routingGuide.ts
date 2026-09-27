import { toCamelCase, toPascalCase } from "@canonical/utils";

/** One way to route the new page: a route entry, and what the page then takes. */
export interface RouteExample {
  /** What the example shows, printed above it. */
  readonly label: string;
  /** Lines for routes.ts that go above the routes object (imports, schemas). */
  readonly setup: readonly string[];
  /** The entry for the routes object. */
  readonly entry: string;
  /** Lines for the page file: its extra imports, then its new signature. */
  readonly page: readonly string[];
}

/**
 * The hand-routing guide printed after the page is written. The text is fixed;
 * only the domain and page names are substituted in. Every url in it is an
 * example value for the reader to adapt, never a claim about the app.
 */
export interface RoutingGuide {
  readonly pageFile: string;
  readonly routesFile: string;
  /** The import line for the page, in the domain's routes.ts. */
  readonly pageImport: string;
  readonly examples: readonly RouteExample[];
  /**
   * Lines for src/routes.tsx: import the domain routes, group, list. They
   * carry {@link LAYOUT_PLACEHOLDER} where the app names its own wrapper.
   */
  readonly wiring: readonly string[];
}

/**
 * Stands for the `wrapper()` the route renders in, which each app names for
 * itself. Printed as is, so it cannot be mistaken for a name that exists.
 */
export const LAYOUT_PLACEHOLDER = "<layout>";

export function routingGuide(domain: string, name: string): RoutingGuide {
  const pageName = `${toPascalCase(name)}Page`;
  const key = toCamelCase(name);
  const domainRoutes = `${toCamelCase(domain)}Routes`;
  const searchSchema = `${key}Search`;
  const signature = (props: string, type: string) => [
    `export default function ${pageName}({`,
    `  ${props},`,
    `}: ${type}): ReactElement {`,
  ];

  return {
    pageFile: `src/domains/${domain}/${pageName}.tsx`,
    routesFile: `src/domains/${domain}/routes.ts`,
    pageImport: `import ${pageName} from "./${pageName}.js";`,
    examples: [
      {
        label: "A static url:",
        setup: [],
        entry: `${key}: route({ url: "/${domain}/${name}", content: ${pageName} }),`,
        page: [],
      },
      {
        label:
          "A url with a :param segment; the page takes the params it declares:",
        setup: [],
        entry: `${key}: route({ url: "/${domain}/:id", content: ${pageName} }),`,
        page: [
          'import type { RouteContentProps, RouteParams } from "@canonical/router-core";',
          ...signature(
            "params",
            `RouteContentProps<RouteParams<"/${domain}/:id">>`,
          ),
        ],
      },
      {
        label:
          "A typed search schema (Standard Schema v1, so Zod, Valibot or ArkType fit too); the page reads search:",
        setup: [
          'import type { StandardSchemaV1 } from "@canonical/router-core";',
          `const ${searchSchema}: StandardSchemaV1<Record<string, unknown>, { readonly q?: string }> = {`,
          '  "~standard": {',
          "    version: 1,",
          '    vendor: "app",',
          "    validate(value) {",
          '      const q = typeof value === "object" && value !== null && "q" in value ? value.q : undefined;',
          '      return { value: { q: typeof q === "string" ? q : undefined } };',
          "    },",
          "  },",
          "};",
        ],
        entry: `${key}: route({ url: "/${domain}/${name}", search: ${searchSchema}, content: ${pageName} }),`,
        page: [
          'import type { RouteContentProps } from "@canonical/router-core";',
          ...signature(
            "search",
            "RouteContentProps<Record<string, never>, { readonly q?: string }>",
          ),
        ],
      },
    ],
    wiring: [
      `import ${domainRoutes} from "#domains/${domain}/routes.js";`,
      `const [${key}] = group(${LAYOUT_PLACEHOLDER}, [${domainRoutes}.${key}] as const);`,
      `const appRoutes = { /* …the routes already listed */ ${key} } as const;`,
    ],
  };
}

/** The guide as the lines printed after the page is written. */
export function formatRoutingGuide(guide: RoutingGuide): string[] {
  const indent = (line: string) => `  ${line}`;
  const fileName = guide.pageFile.slice(guide.pageFile.lastIndexOf("/") + 1);

  return [
    `Created ${guide.pageFile}. Nothing else was changed; route the page by hand.`,
    "",
    `In ${guide.routesFile}, import the page:`,
    indent(guide.pageImport),
    "",
    "Then add one entry to its routes object. The urls are examples to adapt.",
    ...guide.examples.flatMap((example) => [
      "",
      example.label,
      ...example.setup.map(indent),
      indent(example.entry),
      ...(example.page.length > 0
        ? [indent(`// ${fileName}`), ...example.page.map(indent)]
        : []),
    ]),
    "",
    `In src/routes.tsx, put the route in a group() and list it in appRoutes (${LAYOUT_PLACEHOLDER} stands for your wrapper()):`,
    ...guide.wiring.map(indent),
  ];
}
