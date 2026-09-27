/**
 * The source of a page component: a default-exported function returning a
 * `<section>` labelled by its heading, with the page's `<Head>` title. Any
 * `body` lines are placed under the heading.
 */
export function buildPage(options: {
  /** The component name, e.g. `DetailPage`. */
  readonly pageName: string;
  /** The page title, used for both `<Head>` and the heading. */
  readonly title: string;
  /** The heading's id, which the section is labelled by. */
  readonly headingId: string;
  /** JSX lines under the heading, without indentation. */
  readonly body?: readonly string[];
}): string {
  const { pageName, title, headingId, body = [] } = options;
  const lines = body.map((line) => `      ${line}\n`).join("");

  return `import { Head } from "@canonical/react-head";
import type { ReactElement } from "react";

export default function ${pageName}(): ReactElement {
  return (
    <section aria-labelledby="${headingId}">
      <Head title="${title}" />
      <h1 id="${headingId}">${title}</h1>
${lines}    </section>
  );
}
`;
}
