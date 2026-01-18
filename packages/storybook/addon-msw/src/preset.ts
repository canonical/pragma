// This entry is a node-specific file, contrary to the other files in this folder which are made to be loaded in the browser.
// This preset automatically provides the mockServiceWorker.js to consuming packages.

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Automatically serve mockServiceWorker.js for packages that include this addon.
// The public/ folder contains the MSW service worker generated via `npx msw init public/`.
// This eliminates the need for each consuming package to have its own copy.
export const staticDirs = [join(__dirname, "../../public")];
