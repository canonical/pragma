import type { HTMLAttributes } from "react";
import type { DtcgTokenType } from "./dtcg.js";

export type TokenType = DtcgTokenType;

export type TokenTier = "primitive" | "semantic" | "derived";

export type Stability = "stable" | "wip" | "experimental";

export type Derivation =
  | "hover"
  | "active"
  | "disabled"
  | "delta"
  | "channel-modifier"
  | "channel-surface";

export interface TokenEntry {
  cssVar: string;
  id: string | null;
  description?: string;
  aliasChain?: string[];
  type: TokenType;
  tier: TokenTier;
  stability: Stability;
  cssOutputFile: string;
  cssSelector?: string;
  cssType?: string;
  isPaired: boolean;
  valueLight?: string;
  valueDark?: string;
  hexLight?: string;
  hexDark?: string;
  derivedFrom?: string;
  derivation?: Derivation;
  registered?: boolean;
  syntax?: string | null;
  inherits?: boolean | null;
  initialValue?: string | null;
}

export type TokenColumnId =
  | "token"
  | "swatch"
  | "light"
  | "dark"
  | "value"
  | "type"
  | "tier"
  | "stability"
  | "derivedFrom"
  | "derivation";

export type TokenGroupBy =
  | "type"
  | "tier"
  | "cssOutputFile"
  | "derivation"
  | "prefix";

export interface TokenTableProps extends HTMLAttributes<HTMLDivElement> {
  tokens: TokenEntry[];
  title?: string;
  caption?: string;
  columns?: TokenColumnId[];
  searchable?: boolean;
  showCount?: boolean;
  dense?: boolean;
  groupBy?: TokenGroupBy;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export interface TokenTabsProps {
  tabs: {
    label: string;
    tokens: TokenEntry[];
    tableProps?: Partial<Omit<TokenTableProps, "tokens">>;
  }[];
  defaultTab?: number;
  className?: string;
}
