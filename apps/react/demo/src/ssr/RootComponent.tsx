import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import { Showcase } from "../ui/index.js";

export type InitialData = Record<string, unknown>;

function RootComponent(props: ServerEntrypointProps<InitialData>) {
  return (
    <html lang={props.lang}>
      <head>
        <title>Canonical React Vite Boilerplate</title>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        <Showcase />
      </body>
    </html>
  );
}

export default RootComponent;
