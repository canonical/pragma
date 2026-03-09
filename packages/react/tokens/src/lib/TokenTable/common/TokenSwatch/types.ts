import type { HTMLAttributes } from "react";
import type { TokenEntry } from "../../types.js";

export interface TokenSwatchProps extends HTMLAttributes<HTMLDivElement> {
  token: TokenEntry;
  contextClass?: string;
}
