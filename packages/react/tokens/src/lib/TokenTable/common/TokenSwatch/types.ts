import type { ComponentProps } from "react";
import type { TokenEntry } from "../../types.js";

type OwnProps = {
  token: TokenEntry;
  contextClass?: string;
};

export type TokenSwatchProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
