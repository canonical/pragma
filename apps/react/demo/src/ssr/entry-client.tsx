import { hydrateRoot } from "react-dom/client";
import "../index.css";
import Application from "../Application.js";

hydrateRoot(document.getElementById("root") as HTMLElement, <Application />);
