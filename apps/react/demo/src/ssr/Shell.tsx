import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import Application from "../Application.js";

export type InitialData = Record<string, unknown>;

function Shell(props: ServerEntrypointProps<InitialData>) {
  return (
    <html lang={props.lang}>
      <head>
        <title>Canonical React Vite Boilerplate</title>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <div id="root">
          <Application />
        </div>
      </body>
    </html>
  );
}

export default Shell;
