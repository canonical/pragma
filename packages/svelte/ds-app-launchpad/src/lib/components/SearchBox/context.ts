import { createContext } from "svelte";
import type { SearchBoxContext } from "./types.js";

export const [getSearchBoxContext, setSearchBoxContext] =
  createContext<SearchBoxContext>();
