import { createContext } from "svelte";
import type { ModalContext } from "./types.js";

export const [getModalContext, setModalContext] = createContext<ModalContext>();
