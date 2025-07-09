import type {
  ReactServerEntrypointComponent,
  RendererServerEntrypointProps,
} from "@canonical/react-ssr/renderer";
import Application from "../Application.js";

const EntryServer: ReactServerEntrypointComponent<
  RendererServerEntrypointProps
> = ({ lang = "en", scriptTags, linkTags }: RendererServerEntrypointProps) => {
  return (
    <html lang={lang}>
      <head>
        <title>Canonical React Vite Boilerplate</title>
        {scriptTags}
        {linkTags}
      </head>
      <body>
        {/* biome-ignore lint/nursery/useUniqueElementIds: necessary for server-side rendering */}
        <div id="root">
          <Application />
        </div>
      </body>
    </html>
  );
};

export default EntryServer;
