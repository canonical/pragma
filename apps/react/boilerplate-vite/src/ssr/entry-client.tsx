import { hydrateRoot } from "react-dom/client";
import "../index.css";
import Shell from "./Shell.js";

// entry-server page must match exactly the hydrated page in entry-client
hydrateRoot(document, <Shell />);

console.log("hydrated");
