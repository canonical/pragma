import { createContext } from "svelte";
import type { DescriptionListContext } from "./types.js";

export const [getDescriptionListContext, setDescriptionListContext] =
  createContext<DescriptionListContext>();
