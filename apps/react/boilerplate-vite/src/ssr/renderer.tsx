import fs from "node:fs/promises";
import path from "node:path";
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import { createServerAppRouter, normalizeRequestHref } from "../routes.js";
import EntryServer from "./entry-server.js";
import type { InitialData } from "./Shell.js";

export const htmlString = await fs.readFile(
  path.join(process.cwd(), "dist", "client", "index.html"),
  "utf-8",
);

export interface RenderPreparation {
  readonly initialData: InitialData;
  readonly renderer: JSXRenderer<typeof EntryServer, InitialData>;
}

export default async function prepareRender(
  requestUrl: string,
): Promise<RenderPreparation> {
  const router = createServerAppRouter();
  const loadResult = await router.load(normalizeRequestHref(requestUrl));
  const initialData = loadResult.dehydrate() as unknown as InitialData;

  return {
    initialData,
    renderer: new JSXRenderer(EntryServer, initialData, {
      htmlString,
    }),
  };
}
