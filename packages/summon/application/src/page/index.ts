import * as path from "node:path";
import type {
  GeneratorDefinition,
  PromptDefinition,
} from "@canonical/summon-core";
import {
  exists,
  fail,
  flatMap,
  info,
  sequence_,
  writeFile,
} from "@canonical/task";
import { toCamelCase, toPascalCase, toTitleCase } from "@canonical/utils";
import { normalizeCommandPath } from "../shared/casing.js";
import { packageVersion } from "../shared/packageVersion.js";
import { validateCommandPath } from "../shared/validators.js";
import { formatRoutingGuide, routingGuide } from "./routingGuide.js";

export interface PageAnswers {
  readonly pagePath: string;
}

const validateSegments = validateCommandPath({
  label: "Page path",
  minSegments: 2,
  maxSegments: 2,
  example: "invoices/detail",
});

/**
 * Two name segments, `<domain>/<name>`. A leading slash is refused rather than
 * stripped: "/invoices/detail" reads as a url or an absolute path, and the
 * page path is neither.
 */
function validatePagePath(value: unknown): true | string {
  if (typeof value === "string" && /^\s*[/\\]/.test(value)) {
    return "Page path must be <domain>/<name>, not an absolute path (for example invoices/detail)";
  }
  return validateSegments(value);
}

const prompts: PromptDefinition[] = [
  {
    name: "pagePath",
    type: "text",
    message: "Page path, as <domain>/<name> (for example invoices/detail):",
    positional: true,
    validate: validatePagePath,
    group: "Page",
  },
];

function buildPage(pageName: string, name: string): string {
  const title = toTitleCase(name);
  const headingId = `${toCamelCase(name)}-title`;

  return `import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function ${pageName}(): ReactElement {
  return (
    <section aria-labelledby="${headingId}">
      <Head title="${title}" />
      <h1 id="${headingId}">${title}</h1>
    </section>
  );
}
`;
}

export const generator: GeneratorDefinition<PageAnswers> = {
  meta: {
    name: "page",
    displayName: "@canonical/summon-application:page",
    description: "Add a page component to an existing domain",
    version: packageVersion(),
    help: `Writes one new file, src/domains/<domain>/<Name>Page.tsx, and edits nothing.

The argument is exactly two segments: the domain, then the page name.
"invoices/detail" writes src/domains/invoices/DetailPage.tsx.

The page is not routed yet. After writing it, the generator prints what to add
by hand: the import line for src/domains/<domain>/routes.ts, example route
entries to adapt (a static url, a url with a :param and the page's params
signature, a typed search schema and the page's search signature), and the
group() and appRoutes lines for src/routes.tsx.

Refuses to run when the domain does not exist or the page file already exists.
--undo deletes the page file.

Create the domain first with: summon domain <name>`,
    examples: [
      "summon page invoices/detail",
      "summon page account/settings",
      "summon page --dry-run billing/payments",
      "summon page --undo invoices/detail",
    ],
  },

  prompts,

  generate: (answers) => {
    const verdict = validatePagePath(answers.pagePath);
    if (verdict !== true) {
      return fail({ code: "PAGE_PATH_INVALID", message: verdict });
    }

    const [domainName, name] = normalizeCommandPath(answers.pagePath).split(
      "/",
    );
    const pageName = `${toPascalCase(name)}Page`;
    const domainDir = path.join("src", "domains", domainName);
    const pageFile = path.join(domainDir, `${pageName}.tsx`);
    const routesFile = path.join(domainDir, "routes.ts");

    // No mkdir: the page goes into an *existing* domain (guarded below), and
    // mkdir's default undo would delete that domain's folder on `--undo`.
    // writeFile's default undo deletes the file, which is exactly `--undo`.
    const scaffold = sequence_([
      writeFile(pageFile, buildPage(pageName, name)),
      // One message, so the code lines print without a per-line prefix and
      // can be copied as they are.
      info(formatRoutingGuide(routingGuide(domainName, name)).join("\n")),
    ]);

    // Guard before touching anything:
    // - the domain must exist (a page is added to an existing domain);
    // - the page must NOT exist (the write's undo is a delete, so overwriting
    //   a hand-authored page then running `--undo` would destroy the original).
    return flatMap(exists(routesFile), (domainPresent) =>
      !domainPresent
        ? fail({
            code: "PAGE_DOMAIN_MISSING",
            message: `Domain "${domainName}" not found (${routesFile} missing). Create it first with: summon domain ${domainName}`,
          })
        : flatMap(exists(pageFile), (pagePresent) =>
            pagePresent
              ? fail({
                  code: "PAGE_EXISTS",
                  message: `Page "${pageFile}" already exists. Choose a different page name or remove the file first.`,
                })
              : scaffold,
          ),
    );
  },
};

export default generator;
