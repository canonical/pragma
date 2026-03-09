/**
 * Local mirror of the DTCG token vocabulary used by the token explorer.
 */

export const DTCG_TOKEN_TYPES = [
  "color",
  "dimension",
  "number",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "gradient",
  "border",
  "shadow",
  "typography",
  "transition",
  "strokeStyle",
] as const;

export type DtcgTokenType = (typeof DTCG_TOKEN_TYPES)[number];

export const DTCG_TOKEN_TYPE_LABELS: Record<DtcgTokenType, string> = {
  color: "Color",
  dimension: "Dimension",
  number: "Number",
  fontFamily: "Font family",
  fontWeight: "Font weight",
  duration: "Duration",
  cubicBezier: "Cubic bezier",
  gradient: "Gradient",
  border: "Border",
  shadow: "Shadow",
  typography: "Typography",
  transition: "Transition",
  strokeStyle: "Stroke style",
};

export const DTCG_TOKEN_TYPE_TO_CSS: Record<DtcgTokenType, string> = {
  color: "<color>",
  number: "<number>",
  fontFamily: "<family-name>",
  fontWeight: "<number>",
  duration: "<time>",
  cubicBezier: "<easing-function>",
  gradient: "<gradient>",
  border: "<unknown>",
  shadow: "<unknown>",
  typography: "<unknown>",
  transition: "<unknown>",
  strokeStyle: "<unknown>",
  dimension: "<length>",
};

export const TOKEN_LENS_DESCRIPTIONS = {
  tier: {
    title: "Tier lens",
    why: "Use this when deciding what to consume versus what only exists as implementation infrastructure.",
  },
  prefix: {
    title: "Family lens",
    why: "Use this when looking for all text, border, icon, foreground, or motion tokens in one semantic family.",
  },
  derivation: {
    title: "Derivation lens",
    why: "Use this when debugging how modifiers, surfaces, and interaction states are produced from a base token.",
  },
  cssOutputFile: {
    title: "Output-file lens",
    why: "Use this when validating how the build emitted tokens into CSS layers and generated artifacts.",
  },
  type: {
    title: "DTCG type lens",
    why: "Use this when you need the rendering and assignability semantics defined by the DTCG model, not just design-system naming.",
  },
} as const;
