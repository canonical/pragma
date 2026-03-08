import type React from "react";
import { useMemo, useState } from "react";
import { TokenSwatch } from "./common/TokenSwatch/index.js";
import type {
  Derivation,
  TokenColumnId,
  TokenEntry,
  TokenGroupBy,
  TokenTableProps,
} from "./types.js";
import "./styles.css";

interface TokenGroup {
  label: string;
  tokens: TokenEntry[];
}

const STABILITY_LABELS = {
  stable: "Stable",
  wip: "WIP",
  experimental: "Experimental",
} as const;

const COLUMN_LABELS: Record<TokenColumnId, string> = {
  token: "Token",
  swatch: "Preview",
  light: "Light",
  dark: "Dark",
  value: "Value",
  type: "Type",
  tier: "Tier",
  stability: "Status",
  derivedFrom: "Derived from",
  derivation: "Derivation",
};

const componentCssClassName = "ds token-table";

/**
 * A dense, scannable table for browsing design tokens. Renders token names,
 * visual previews (via TokenSwatch), resolved values, and metadata columns.
 * Supports search, grouping by multiple lenses (tier, type, prefix,
 * derivation, CSS output file), and column configuration.
 *
 * @implements dso:global.component.token-table
 */
export const TokenTable = ({
  tokens,
  title,
  caption,
  columns: explicitColumns,
  searchable = false,
  showCount = true,
  dense = true,
  groupBy,
  searchPlaceholder = "Search tokens, ids, or files…",
  emptyMessage = "No tokens match the current filters.",
  className,
  ...props
}: TokenTableProps): React.ReactElement => {
  const [search, setSearch] = useState("");

  const columns = useMemo<TokenColumnId[]>(() => {
    if (explicitColumns) return explicitColumns;

    const inferredColumns: TokenColumnId[] = ["token", "swatch", "stability"];
    const hasPaired = tokens.some((token) => token.isPaired);
    const hasValue = tokens.some(
      (token) => token.valueLight || token.valueDark,
    );
    const allSingleValue = tokens.every(
      (token) => Boolean(token.valueLight) && !token.isPaired,
    );
    const allDerived = tokens.every(
      (token) =>
        Boolean(token.derivedFrom) && !token.valueLight && !token.valueDark,
    );

    if (hasPaired) {
      inferredColumns.push("light", "dark");
    } else if (allDerived) {
      inferredColumns.push("derivedFrom", "derivation");
    } else if (allSingleValue || hasValue) {
      inferredColumns.push("value");
    }

    return inferredColumns;
  }, [tokens, explicitColumns]);

  const filteredTokens = useMemo(() => {
    if (!search) return tokens;

    const query = search.trim().toLowerCase();
    return tokens.filter((token) => getSearchText(token).includes(query));
  }, [tokens, search]);

  const groups = useMemo(
    () => groupTokens(filteredTokens, groupBy),
    [filteredTokens, groupBy],
  );

  const classes = [
    componentCssClassName,
    dense ? "dense" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {(title || caption || searchable || showCount) && (
        <div className="toolbar">
          <div className="heading">
            {title && <h3 className="title">{title}</h3>}
            {caption && <p className="caption">{caption}</p>}
          </div>

          <div className="controls">
            {showCount && (
              <span className="count">
                {filteredTokens.length} token
                {filteredTokens.length === 1 ? "" : "s"}
              </span>
            )}

            {searchable && (
              <input
                type="search"
                className="search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {filteredTokens.length > 0 ? (
        <div className="scroll">
          <table className="grid">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{COLUMN_LABELS[column]}</th>
                ))}
              </tr>
            </thead>

            {groups.map((group) => (
              <tbody key={group.label}>
                {groupBy && (
                  <tr className="group-row">
                    <th colSpan={columns.length}>{group.label}</th>
                  </tr>
                )}

                {group.tokens.map((token) => (
                  <tr
                    key={token.cssVar}
                    className={["row", token.tier].filter(Boolean).join(" ")}
                  >
                    {columns.includes("token") && (
                      <td>
                        <div className="token-cell">
                          <code className="var-name">{token.cssVar}</code>
                          <div className="meta">
                            {token.id && (
                              <span className="meta-item">{token.id}</span>
                            )}
                            <span className="meta-item">{token.type}</span>
                            <span className="meta-item">{token.tier}</span>
                            <span className="meta-item">
                              {token.cssOutputFile}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    {columns.includes("swatch") && (
                      <td>
                        <TokenSwatch token={token} />
                      </td>
                    )}

                    {columns.includes("light") && (
                      <td>
                        <code className="value">{token.valueLight || "—"}</code>
                      </td>
                    )}

                    {columns.includes("dark") && (
                      <td>
                        <code className="value">{token.valueDark || "—"}</code>
                      </td>
                    )}

                    {columns.includes("value") && (
                      <td>
                        <code className="value">
                          {token.valueLight || token.valueDark || "—"}
                        </code>
                      </td>
                    )}

                    {columns.includes("type") && <td>{token.type}</td>}
                    {columns.includes("tier") && <td>{token.tier}</td>}

                    {columns.includes("stability") && (
                      <td>
                        <span
                          className={["stability", token.stability]
                            .filter(Boolean)
                            .join(" ")}
                          title={STABILITY_LABELS[token.stability]}
                        >
                          {STABILITY_LABELS[token.stability]}
                        </span>
                      </td>
                    )}

                    {columns.includes("derivedFrom") && (
                      <td>
                        <code className="value wrap">
                          {token.derivedFrom || "—"}
                        </code>
                      </td>
                    )}

                    {columns.includes("derivation") && (
                      <td>
                        <span className="derivation">
                          {token.derivation
                            ? formatDerivation(token.derivation)
                            : "—"}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      ) : (
        <p className="empty">{emptyMessage}</p>
      )}
    </div>
  );
};

function getSearchText(token: TokenEntry): string {
  return [
    token.cssVar,
    token.id,
    token.description,
    token.aliasChain?.join(" "),
    token.type,
    token.tier,
    token.stability,
    token.cssOutputFile,
    token.cssSelector,
    token.cssType,
    token.derivedFrom,
    token.derivation,
    token.valueLight,
    token.valueDark,
    token.hexLight,
    token.hexDark,
    token.syntax,
    token.initialValue,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function groupTokens(
  tokens: TokenEntry[],
  groupBy?: TokenGroupBy,
): TokenGroup[] {
  if (!groupBy) {
    return [{ label: "Tokens", tokens }];
  }

  const grouped = new Map<string, TokenEntry[]>();

  for (const token of tokens) {
    const label = getGroupLabel(token, groupBy);
    const existing = grouped.get(label);

    if (existing) {
      existing.push(token);
    } else {
      grouped.set(label, [token]);
    }
  }

  return Array.from(grouped.entries()).map(([label, groupedTokens]) => ({
    label,
    tokens: groupedTokens,
  }));
}

function getGroupLabel(token: TokenEntry, groupBy: TokenGroupBy): string {
  switch (groupBy) {
    case "type":
      return capitalize(token.type);
    case "tier":
      return capitalize(token.tier);
    case "cssOutputFile":
      return token.cssOutputFile;
    case "derivation":
      return token.derivation ? formatDerivation(token.derivation) : "Base";
    case "prefix":
      return getPrefixLabel(token.cssVar);
  }
}

function getPrefixLabel(cssVar: string): string {
  const parts = cssVar.replace(/^--/, "").split("-");

  if (parts[0] === "color" && parts[1]) {
    return `color.${parts[1]}`;
  }

  if (
    (parts[0] === "modifier" || parts[0] === "surface") &&
    parts[1] &&
    parts[2]
  ) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  if (parts[0] === "delta" && parts[1]) {
    return `delta.${parts[1]}`;
  }

  return parts.slice(0, Math.min(2, parts.length)).join(".");
}

function formatDerivation(derivation: Derivation): string {
  return capitalize(derivation.replace(/-/g, " "));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
