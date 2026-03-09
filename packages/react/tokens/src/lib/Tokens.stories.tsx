import { mockTokens } from "./mockTokens.js";
import {
  DTCG_TOKEN_TYPE_LABELS,
  DTCG_TOKEN_TYPE_TO_CSS,
  TOKEN_LENS_DESCRIPTIONS,
  type TokenEntry,
  TokenTable,
} from "./TokenTable/index.js";
import "./Tokens.css";

const primitiveColors = mockTokens.filter(
  (token) => token.tier === "primitive" && token.type === "color",
);
const semanticColors = mockTokens.filter(
  (token) => token.tier === "semantic" && token.type === "color",
);
const dimensions = mockTokens.filter((token) => token.type === "dimension");
const derivedTokens = mockTokens.filter((token) => token.tier === "derived");
const modifierTokens = derivedTokens.filter(
  (token) => token.derivation === "channel-modifier",
);
const surfaceTokens = derivedTokens.filter(
  (token) => token.derivation === "channel-surface",
);
const stateTokens = derivedTokens.filter(
  (token) =>
    token.derivation === "hover" ||
    token.derivation === "active" ||
    token.derivation === "disabled" ||
    token.derivation === "delta",
);

const previewCoverageTokens: TokenEntry[] = [
  {
    cssVar: "--motion-duration-fast",
    id: "motion.duration.fast",
    type: "duration",
    tier: "semantic",
    stability: "wip",
    cssOutputFile: "modifiers.motion.css",
    isPaired: false,
    valueLight: "120ms",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.duration,
  },
  {
    cssVar: "--motion-easing-standard",
    id: "motion.easing.standard",
    type: "cubicBezier",
    tier: "semantic",
    stability: "wip",
    cssOutputFile: "modifiers.motion.css",
    isPaired: false,
    valueLight: "cubic-bezier(0.2, 0, 0, 1)",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.cubicBezier,
  },
  {
    cssVar: "--font-family-brand",
    id: "font.family.brand",
    type: "fontFamily",
    tier: "semantic",
    stability: "wip",
    cssOutputFile: "modifiers.typography.css",
    isPaired: false,
    valueLight: '"Ubuntu", "Helvetica Neue", sans-serif',
    cssType: DTCG_TOKEN_TYPE_TO_CSS.fontFamily,
  },
  {
    cssVar: "--font-weight-strong",
    id: "font.weight.strong",
    type: "fontWeight",
    tier: "semantic",
    stability: "wip",
    cssOutputFile: "modifiers.typography.css",
    isPaired: false,
    valueLight: "700",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.fontWeight,
  },
  {
    cssVar: "--gradient-brand-sheen",
    id: "gradient.brand.sheen",
    type: "gradient",
    tier: "semantic",
    stability: "experimental",
    cssOutputFile: "modifiers.theme.css",
    isPaired: false,
    valueLight: "linear-gradient(90deg, #e95420, #77216f)",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.gradient,
  },
  {
    cssVar: "--border-focus-ring",
    id: "border.focus.ring",
    type: "border",
    tier: "semantic",
    stability: "wip",
    cssOutputFile: "modifiers.theme.css",
    isPaired: false,
    valueLight: "2px solid currentColor",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.border,
  },
  {
    cssVar: "--shadow-raised",
    id: "shadow.raised",
    type: "shadow",
    tier: "semantic",
    stability: "experimental",
    cssOutputFile: "modifiers.theme.css",
    isPaired: false,
    valueLight: "0 8px 24px rgb(0 0 0 / 0.16)",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.shadow,
  },
  {
    cssVar: "--typography-heading-2",
    id: "typography.heading.2",
    type: "typography",
    tier: "semantic",
    stability: "wip",
    cssOutputFile: "modifiers.typography.css",
    isPaired: false,
    valueLight: "600 1.5rem/1.2 var(--font-family-brand)",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.typography,
  },
  {
    cssVar: "--transition-emphasized",
    id: "transition.emphasized",
    type: "transition",
    tier: "semantic",
    stability: "experimental",
    cssOutputFile: "modifiers.motion.css",
    isPaired: false,
    valueLight: "background-color 120ms cubic-bezier(0.2, 0, 0, 1)",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.transition,
  },
  {
    cssVar: "--stroke-style-accent",
    id: "stroke.style.accent",
    type: "strokeStyle",
    tier: "semantic",
    stability: "experimental",
    cssOutputFile: "modifiers.theme.css",
    isPaired: false,
    valueLight: "dashed",
    cssType: DTCG_TOKEN_TYPE_TO_CSS.strokeStyle,
  },
];

const lensCards = [
  {
    key: "tier",
    example:
      "Use this first when asking: should component authors consume this token directly?",
  },
  {
    key: "prefix",
    example:
      "Use this when you need all text, border, or foreground tokens in the same domain.",
  },
  {
    key: "derivation",
    example:
      "Use this when debugging states, surface channels, or modifier rebinding.",
  },
  {
    key: "cssOutputFile",
    example:
      "Use this when validating how the build emitted CSS and cascade layers.",
  },
  {
    key: "type",
    example:
      "Use this when token rendering or CSS assignability matters more than semantic family naming.",
  },
] as const;

const meta = {
  title: "Foundation/Design Tokens",
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Compact reference pages for the phase-1 token architecture. The goal is fast scanning and comparison, not exhaustive prose.",
      },
    },
  },
};

export default meta;

export const Overview = {
  parameters: {
    docs: {
      description: {
        story:
          "High-level orientation for the token system: the mental model, the tier hierarchy, and landscape KPIs. Use this page to understand the contract before diving into reference tables.",
      },
    },
  },
  render: () => (
    <div className="ds token-page">
      <section className="banner">
        <div>
          <p className="eyebrow">Phase 1 token explorer</p>
          <h2 className="title">A lighter way to explain the system</h2>
          <p>
            This page uses a curated token slice to teach the contract:
            primitives feed semantic tokens, and semantic tokens are rebound by
            modifiers, surfaces, and states.
          </p>
        </div>
        <div className="notice">
          <strong>WIP</strong>
          <span>
            Token names and values may still change. Codemods will handle
            first-party migrations.
          </span>
        </div>
      </section>

      <section className="kpi-grid">
        <div className="kpi">
          <span className="eyebrow">Curated sample</span>
          <strong className="value">{mockTokens.length}</strong>
          <span className="detail">phase-1 reference tokens</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">Semantic API</span>
          <strong className="value">{semanticColors.length}</strong>
          <span className="detail">tokens components should read</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">Derived behavior</span>
          <strong className="value">{derivedTokens.length}</strong>
          <span className="detail">channels and interaction states</span>
        </div>
        <div className="kpi">
          <span className="eyebrow">Real target</span>
          <strong className="value">730</strong>
          <span className="detail">tokens once the artifact lands</span>
        </div>
      </section>

      <section className="panel">
        <div className="header">
          <h3>Rules of thumb</h3>
          <p>Keep the mental model small and the fallback chains explicit.</p>
        </div>
        <div className="rule-grid">
          <article className="rule">
            <strong>1. Components read semantic tokens</strong>
            <p>
              Prefer <code>--color-text</code> or{" "}
              <code>--color-background</code>, not palette primitives.
            </p>
          </article>
          <article className="rule">
            <strong>2. Modifiers rebind channel variables</strong>
            <p>
              A container class like <code>.error</code> changes descendant
              output without changing component code.
            </p>
          </article>
          <article className="rule">
            <strong>3. Surfaces add depth</strong>
            <p>
              Nest <code>.surface</code> containers to get layered backgrounds
              from the cascade.
            </p>
          </article>
          <article className="rule">
            <strong>4. States derive from the base token</strong>
            <p>
              Hover, active, and disabled values stay aligned with the current
              theme and modifier context.
            </p>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="header">
          <h3>Hierarchy at a glance</h3>
          <p>
            Use primitives as source material, semantic tokens as API, and
            derived tokens as infrastructure.
          </p>
        </div>
        <div className="hierarchy-grid">
          <article className="hierarchy-card">
            <span className="eyebrow">1</span>
            <h4>Primitive</h4>
            <p>
              Raw values such as <code>--color-palette-gray-500</code> and{" "}
              <code>--dimension-2</code>.
            </p>
            <span className="note">
              Never reference directly in component styles.
            </span>
          </article>
          <article className="hierarchy-card">
            <span className="eyebrow">2</span>
            <h4>Semantic</h4>
            <p>
              Intent-bearing tokens such as <code>--color-text</code> and{" "}
              <code>--color-foreground-primary</code>.
            </p>
            <span className="note">This is the consumer-facing API.</span>
          </article>
          <article className="hierarchy-card">
            <span className="eyebrow">3</span>
            <h4>Derived</h4>
            <p>
              Infrastructure tokens such as <code>--modifier-color-text</code>{" "}
              and <code>--hover--color-foreground-primary</code>.
            </p>
            <span className="note">
              These are resolved through fallback chains and context.
            </span>
          </article>
        </div>
      </section>

      <TokenTable
        tokens={semanticColors.slice(0, 6)}
        title="Representative semantic colors"
        caption="Use the Storybook theme switcher to verify that semantic colors stay useful across light and dark modes."
        columns={["token", "swatch", "light", "dark", "stability"]}
        showCount={false}
      />
    </div>
  ),
};

export const Explorer = {
  parameters: {
    docs: {
      description: {
        story:
          "The dense reference catalog. Five grouping lenses and full-type coverage in a single scrollable view. Use this page for token lookup and comparison.",
      },
    },
  },
  render: () => (
    <div className="ds token-page">
      <section className="panel">
        <div className="header">
          <h3>Explorer</h3>
          <p>
            The dense catalog keeps token lookup in one place. Scan the token
            name, preview, and compact metadata before reaching for
            implementation docs.
          </p>
        </div>
        <div className="header">
          <h4>Why these lenses exist</h4>
          <p>
            These are not arbitrary filters. Each lens answers a different
            consumer question: what should I use, what family am I in, how was
            this derived, which generated file owns it, and what does the DTCG
            type imply?
          </p>
        </div>
        <div className="lens-grid">
          {lensCards.map(({ key, example }) => {
            const lens = TOKEN_LENS_DESCRIPTIONS[key];
            return (
              <article key={key} className="lens-card">
                <span className="eyebrow">{lens.title}</span>
                <p className="why">{lens.why}</p>
                <p className="example">{example}</p>
              </article>
            );
          })}
        </div>
        <div className="type-note">
          <strong>DTCG type coverage in this explorer:</strong>{" "}
          {previewCoverageTokens
            .map((token) => DTCG_TOKEN_TYPE_LABELS[token.type])
            .join(", ")}
        </div>
        <div className="stack">
          <TokenTable
            tokens={previewCoverageTokens}
            title="DTCG type coverage"
            caption="This table is a contract check. It exercises the full DTCG-aligned preview switch, using the same vocabulary as the LSP and CSS artifact model."
            columns={["token", "swatch", "value", "type", "stability"]}
            showCount={false}
            groupBy="type"
          />
          <TokenTable
            tokens={semanticColors}
            title="Semantic colors"
            caption="This is the family lens in practice. Grouping by prefix helps consumers find the semantic domain they need: text, border, icon, or foreground."
            columns={["token", "swatch", "light", "dark", "stability"]}
            searchable
            groupBy="prefix"
          />
          <TokenTable
            tokens={primitiveColors}
            title="Primitive palette"
            caption="This is the tier lens in practice. Primitive tokens explain where semantic values come from, but they are not the component API."
            columns={["token", "swatch", "value", "stability"]}
            searchable
          />
          <TokenTable
            tokens={dimensions}
            title="Spacing scale"
            caption="Dimension tokens shown as compact bars to make relative spacing easier to compare."
            columns={["token", "swatch", "value", "stability"]}
            searchable
          />
          <TokenTable
            tokens={derivedTokens}
            title="Derived relationships"
            caption="This is the derivation lens in practice. Derived tokens are best understood as relationships from a base token to a context or state outcome."
            columns={[
              "token",
              "swatch",
              "derivedFrom",
              "derivation",
              "stability",
            ]}
            searchable
            groupBy="derivation"
          />
        </div>
      </section>
    </div>
  ),
};

export const Modifiers = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates how ancestor modifier classes (.error, .success, .warning) rebind channel variables used by descendants, changing semantic output without changing component code.",
      },
    },
  },
  render: () => (
    <div className="ds token-page">
      <section className="panel">
        <div className="header">
          <h4>Modifier channels</h4>
          <p>Ancestor classes rebind channel variables used by descendants.</p>
        </div>
        <div className="preview-grid modifiers">
          <div className="preview-card sample">
            <span className="eyebrow">Default</span>
            <strong className="title">Base semantic output</strong>
            <p>
              Components fall back to semantic tokens when no modifier class is
              applied.
            </p>
          </div>
          <div className="preview-card sample error">
            <span className="eyebrow">.error</span>
            <strong className="title">Error context</strong>
            <p>
              Text and emphasis are rebound through modifier channel variables.
            </p>
          </div>
          <div className="preview-card sample success">
            <span className="eyebrow">.success</span>
            <strong className="title">Success context</strong>
            <p>
              The same component code resolves to a different semantic outcome.
            </p>
          </div>
          <div className="preview-card sample warning">
            <span className="eyebrow">.warning</span>
            <strong className="title">Warning context</strong>
            <p>
              Modifier composition remains in the CSS cascade, not in component
              props.
            </p>
          </div>
        </div>
        <TokenTable
          tokens={modifierTokens}
          title="Modifier channels"
          columns={[
            "token",
            "swatch",
            "derivedFrom",
            "derivation",
            "stability",
          ]}
          groupBy="derivation"
        />
      </section>
    </div>
  ),
};

export const Surfaces = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows how nested .surface containers create layers without runtime logic. Each nesting level resolves to a progressively shifted background from the cascade.",
      },
    },
  },
  render: () => (
    <div className="ds token-page">
      <section className="panel">
        <div className="header">
          <h4>Surface depth</h4>
          <p>
            Nested <code>.surface</code> containers create layers without
            runtime logic.
          </p>
        </div>
        <div className="surface-stack surface">
          <div className="surface-layer">
            <strong>Layer 1</strong>
            <span>.surface</span>
          </div>
          <div className="surface-stack surface">
            <div className="surface-layer">
              <strong>Layer 2</strong>
              <span>.surface .surface</span>
            </div>
            <div className="surface-stack surface">
              <div className="surface-layer">
                <strong>Layer 3</strong>
                <span>.surface .surface .surface</span>
              </div>
            </div>
          </div>
        </div>
        <TokenTable
          tokens={surfaceTokens}
          title="Surface channels"
          columns={[
            "token",
            "swatch",
            "derivedFrom",
            "derivation",
            "stability",
          ]}
          groupBy="derivation"
        />
      </section>
    </div>
  ),
};

export const InteractionStates = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates how interaction-state tokens (hover, active, disabled, delta) are computed from the current foreground token, inheriting theme and modifier context automatically.",
      },
    },
  },
  render: () => (
    <div className="ds token-page">
      <section className="panel">
        <div className="header">
          <h4>Interaction states</h4>
          <p>
            States are computed from the current foreground token, so they
            inherit theme and context automatically.
          </p>
        </div>
        <div className="state-strip">
          <button type="button" className="state-button">
            Rest
          </button>
          <button type="button" className="state-button hover">
            Hover
          </button>
          <button type="button" className="state-button active">
            Active
          </button>
          <button type="button" className="state-button disabled" disabled>
            Disabled
          </button>
        </div>
        <TokenTable
          tokens={stateTokens}
          title="State variables"
          columns={[
            "token",
            "swatch",
            "light",
            "dark",
            "derivedFrom",
            "derivation",
            "stability",
          ]}
          groupBy="derivation"
        />
      </section>
    </div>
  ),
};

export const ConsumerGuidance = {
  parameters: {
    docs: {
      description: {
        story:
          "Terse consumption rules: what to use, what to avoid, and how token changes are handled during the pre-1.0 period.",
      },
    },
  },
  render: () => (
    <div className="ds token-page">
      <section className="panel">
        <div className="header">
          <h3>Consumption guidance</h3>
          <p>
            Keep implementation guidance terse: what to use, what to avoid, and
            how change is handled.
          </p>
        </div>
        <div className="guidance-grid">
          <article className="guidance-card good">
            <h4>Do</h4>
            <ul>
              <li>Use semantic tokens as the component API.</li>
              <li>Read channel variables to support modifiers.</li>
              <li>Keep surface support in fallback chains.</li>
            </ul>
          </article>
          <article className="guidance-card bad">
            <h4>Avoid</h4>
            <ul>
              <li>Using palette primitives directly in components.</li>
              <li>Hardcoding color values in implementation code.</li>
              <li>Encoding modifier logic as ad hoc component branches.</li>
            </ul>
          </article>
        </div>
        <div className="code-grid">
          <pre className="code-block">{`/* Good: semantic token with fallback chain */
.button {
  color: var(--modifier-color-text, var(--color-text));
  background: var(
    --modifier-color-foreground-primary,
    var(--surface-color-foreground-primary,
      var(--color-foreground-primary)
    )
  );
}`}</pre>
          <pre className="code-block">{`/* Avoid: primitive token or hardcoded value */
.button {
  background: var(--color-palette-gray-500);
}

.button--custom {
  background: oklch(50% 0 0);
}`}</pre>
        </div>
        <div className="upgrade-note">
          <strong>Change management</strong>
          <p>
            During the pre-1.0 period, pin versions if you are outside the
            monorepo. Inside the monorepo, codemods are the migration path when
            token names change.
          </p>
          <pre className="inline-command">
            <code>npx nx run-many -t codemod:tokens</code>
          </pre>
        </div>
      </section>
    </div>
  ),
};
