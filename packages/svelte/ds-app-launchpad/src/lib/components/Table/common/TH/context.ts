import { createContext } from "svelte";
import type { THContext } from "./types.js";

export const [getTHContext, setTHContext] = createContext<THContext>();
