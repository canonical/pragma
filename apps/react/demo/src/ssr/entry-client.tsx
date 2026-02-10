import { hydrateRoot } from "react-dom/client";
import "../index.css";
import RootComponent from "./RootComponent.js";

// entry-server page must match exactly the hydrated page in entry-client
hydrateRoot(document, <RootComponent lang="en" />);
