import type {
  ReactServerEntrypointComponent,
  RendererServerEntrypointProps,
} from "@canonical/react-ssr/renderer";
import React from "react";
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
        <div id="root">
          <Application />
        </div>
      </body>
    </html>
  );
};

export default EntryServer;
