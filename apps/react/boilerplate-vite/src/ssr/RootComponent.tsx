import type { ServerEntrypointProps } from "@canonical/react-ssr/renderer";
import Application from "../Application.js";

export type InitialData = Record<string, unknown>;

/**
 * This function returns the component that renders the full page both in the Server and in the
 * Client (as it needs to match exactly for hydration to work).
 * If you need to pass the initial data to the Renderer constructor.
 *
 * @param props props can be all automatically extracted by the renderer from the HTML index page
 * or can be provided programmatically to the renderer constructor.
 * @returns root component containing all the HTML of the page to be rendered.
 */
function RootComponent(props: ServerEntrypointProps<InitialData>) {
  console.log("rendering...");
  return (
    <html lang={props.lang}>
      <head>
        <title>Canonical React Vite Boilerplate</title>
        {props.otherHeadElements}
        {props.scriptElements}
        {props.linkElements}
      </head>
      <body>
        {
          // Add the following to pass initial data to the Application:
          // <Application your_data_prop={props.initialData} />
        }
        <Application />
      </body>
    </html>
  );
}

export default RootComponent;
