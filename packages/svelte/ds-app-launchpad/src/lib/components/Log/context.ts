import { createContext } from "svelte";
import type { LogContext } from "./types.js";

export const [getLogContext, setLogContext] = createContext<LogContext>();
