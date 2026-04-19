import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import type { ReactNode } from "react";

export type InitialData = Record<string, unknown>;

interface ShellProps extends ServerEntrypointProps<InitialData> {
  readonly headHtml?: string;
  readonly children?: ReactNode;
}

function Shell(props: ShellProps) {
  return (
    <html lang={props.lang}>
      <head>
        {props.headHtml ? (
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: head tags are pre-escaped by createHeadCollector
            dangerouslySetInnerHTML={{ __html: props.headHtml }}
          />
        ) : (
          <title>Canonical React Vite Boilerplate</title>
        )}
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root">{props.children}</div>
      </body>
    </html>
  );
}

export default Shell;
