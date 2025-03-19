import { createContext } from "react";
import type { EditingContextType } from "./types.js";

const EditingContext = createContext<EditingContextType | undefined>(undefined);

export default EditingContext;
