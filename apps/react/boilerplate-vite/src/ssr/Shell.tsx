import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import type { ReactElement, ReactNode } from "react";

interface ShellProps extends ServerEntrypointProps<Record<string, unknown>> {
  readonly children: ReactNode;
  readonly navigation: ReactNode;
}

export type InitialData = Record<string, unknown>;

export default function Shell(props: ShellProps): ReactElement {
  return (
    <html lang={props.lang}>
      <head>
        <title>Canonical router boilerplate</title>
        <meta
          name="description"
          content="React Vite boilerplate wired to @canonical/router-core and @canonical/router-react."
        />
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root">
          <div className="app-shell">
            {props.navigation}
            <main className="shell-main">{props.children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
