import type React from "react";
import type { TokenEntry } from "../../types.js";
import type { TokenSwatchProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds token-swatch";

/**
 * A visual preview element that renders a token's value using the appropriate
 * representation for its DTCG type. Supports all 13 DTCG token types: color,
 * dimension, number, fontFamily, fontWeight, duration, cubicBezier, gradient,
 * border, shadow, typography, transition, and strokeStyle. Derived tokens
 * without resolved values render as reference arrows to their base token.
 *
 * @implements dso:global.subcomponent.token-swatch
 */
export const TokenSwatch = ({
  token,
  contextClass: _contextClass,
  className,
  ...props
}: TokenSwatchProps): React.ReactElement => {
  if (shouldRenderReference(token)) {
    return renderReference(token, className, props);
  }

  switch (token.type) {
    case "color":
      return renderColor(token, className, props);
    case "dimension":
      return renderDimension(token, className, props);
    case "number":
      return renderNumber(token, className, props);
    case "fontFamily":
      return renderFontFamily(token, className, props);
    case "fontWeight":
      return renderFontWeight(token, className, props);
    case "typography":
      return renderTypography(token, className, props);
    case "duration":
      return renderDuration(token, className, props);
    case "cubicBezier":
      return renderCurve(token, className, props);
    case "gradient":
      return renderGradient(token, className, props);
    case "border":
      return renderBorder(token, className, props);
    case "shadow":
      return renderShadow(token, className, props);
    case "transition":
      return renderTransition(token, className, props);
    case "strokeStyle":
      return renderStrokeStyle(token, className, props);
  }
};

function renderColor(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  const title = getDisplayValue(token);

  return (
    <div
      className={getRootClasses("color-group", className)}
      title={title}
      {...props}
    >
      <span
        className="color"
        style={{ backgroundColor: `var(${token.cssVar}, transparent)` }}
      />
      {token.isPaired && <span className="chip">L/D</span>}
      {(token.hexLight || token.valueLight) && (
        <span className="value">{token.hexLight || token.valueLight}</span>
      )}
    </div>
  );
}

function renderDimension(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("dimension", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <div
        className="bar"
        style={{ width: `min(var(${token.cssVar}, 0px), 8rem)` }}
      />
      <span className="value">{getSingleValue(token)}</span>
    </div>
  );
}

function renderNumber(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("numeric", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span className="chip numeric-chip">
        {token.derivation === "delta" ? "Δ" : "#"}
      </span>
      <span className="value">{formatValueForDisplay(token)}</span>
    </div>
  );
}

function renderFontFamily(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("sample", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span
        className="sample-text"
        style={{
          color: "var(--token-ui-ink, currentColor)",
          fontFamily: `var(${token.cssVar}, inherit)`,
        }}
      >
        Ag
      </span>
      <span className="value">{getSingleValue(token)}</span>
    </div>
  );
}

function renderFontWeight(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("sample", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span
        className="sample-text"
        style={{
          color: "var(--token-ui-ink, currentColor)",
          fontWeight: `var(${token.cssVar}, 600)`,
        }}
      >
        Ag
      </span>
      <span className="value">{getSingleValue(token)}</span>
    </div>
  );
}

function renderTypography(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("sample", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span
        className="sample-text typography"
        style={{
          color:
            "var(--modifier-color-text, var(--color-text, var(--token-ui-ink, currentColor)))",
        }}
      >
        Aa Bb 123
      </span>
      <span className="value">{getSingleValue(token)}</span>
    </div>
  );
}

function renderDuration(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("numeric", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span className="chip">ms</span>
      <span className="value">{getSingleValue(token)}</span>
    </div>
  );
}

function renderCurve(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("curve", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span className="curve-preview" />
      <span className="value">{truncate(getSingleValue(token), 24)}</span>
    </div>
  );
}

function renderGradient(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("sample", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span
        className="mini-box gradient"
        style={{
          background: `var(${token.cssVar}, linear-gradient(90deg, currentColor, transparent))`,
        }}
      />
      <span className="value">{truncate(getSingleValue(token), 24)}</span>
    </div>
  );
}

function renderBorder(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("sample", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span
        className="mini-box"
        style={{ border: `var(${token.cssVar}, 1px solid currentColor)` }}
      />
      <span className="value">{truncate(getSingleValue(token), 24)}</span>
    </div>
  );
}

function renderShadow(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("sample", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span
        className="mini-box shadow"
        style={{
          boxShadow: `var(${token.cssVar}, 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent))`,
        }}
      />
      <span className="value">{truncate(getSingleValue(token), 24)}</span>
    </div>
  );
}

function renderTransition(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("numeric", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span className="chip">↔</span>
      <span className="value">{truncate(getSingleValue(token), 24)}</span>
    </div>
  );
}

function renderStrokeStyle(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div
      className={getRootClasses("sample", className)}
      title={getDisplayValue(token)}
      {...props}
    >
      <span
        className="stroke-line"
        style={{ borderTop: `2px var(${token.cssVar}, dashed) currentColor` }}
      />
      <span className="value">{getSingleValue(token)}</span>
    </div>
  );
}

function renderReference(
  token: TokenEntry,
  className: string | undefined,
  props: Omit<TokenSwatchProps, "token" | "contextClass" | "className">,
) {
  return (
    <div className={getRootClasses("reference", className)} {...props}>
      <span className="arrow">→</span>
      <code className="parent">{token.derivedFrom}</code>
      {token.derivation && (
        <span className="derivation">{token.derivation}</span>
      )}
    </div>
  );
}

function shouldRenderReference(token: TokenEntry): boolean {
  return Boolean(token.derivedFrom) && !token.valueLight && !token.valueDark;
}

function getSingleValue(token: TokenEntry): string {
  return token.valueLight || token.valueDark || token.initialValue || "—";
}

function formatValueForDisplay(token: TokenEntry): string {
  if (token.isPaired && token.valueLight && token.valueDark) {
    if (token.valueLight === token.valueDark) return token.valueLight;
    return `light-dark(${token.valueLight}, ${token.valueDark})`;
  }

  return getSingleValue(token);
}

function getDisplayValue(token: TokenEntry): string {
  const pieces = [
    token.type,
    token.cssType,
    formatValueForDisplay(token),
    token.derivedFrom ? `from ${token.derivedFrom}` : null,
    token.derivation ?? null,
    token.syntax ? `syntax ${token.syntax}` : null,
  ].filter(Boolean);

  return pieces.join(" · ");
}

function getRootClasses(variant: string, className?: string): string {
  return [componentCssClassName, variant, className].filter(Boolean).join(" ");
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}
