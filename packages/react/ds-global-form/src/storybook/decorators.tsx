import { useFormStateEmitter } from "@canonical/storybook-addon-form-state";
import type React from "react";
import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

const formCssClassName = "ds form";

interface FormDecoratorParams {
  defaultValues?: Record<string, unknown>;
  touchedFields?: string[];
  /** Extra class name(s) for the form element (e.g. "form-layout-side") */
  className?: string;
}

export const form = ({
  defaultValues = {},
  touchedFields = [],
  className,
}: FormDecoratorParams = {}) => {
  return (Story: React.ElementType) => {
    const FormWrapper: React.ElementType = () => {
      const methods = useForm({
        mode: "onChange",
        defaultValues,
      });

      useFormStateEmitter(methods);

      // react-hook-form has no `defaultTouched` in UseFormProps.
      // setValue with shouldTouch is the idiomatic workaround.
      // https://github.com/react-hook-form/react-hook-form/issues/1418
      useEffect(() => {
        for (const field of touchedFields) {
          methods.setValue(field, methods.getValues(field), {
            shouldTouch: true,
          });
        }
      }, [methods]);

      return (
        <FormProvider {...methods}>
          <form
            className={[formCssClassName, "subgrid", className]
              .filter(Boolean)
              .join(" ")}
            onSubmit={methods.handleSubmit(() => {})}
          >
            <Story />
          </form>
        </FormProvider>
      );
    };

    return <FormWrapper />;
  };
};

/** Band spacing: half the block padding (above/below) of the inline padding. */
const SURFACE_BAND_PADDING_BLOCK = "2.5rem";
const SURFACE_BAND_PADDING_INLINE = "5rem";

/**
 * One surface band: a full-width row painting its own surface background, its
 * content centred, then — flush below — the next, deeper band. The three surface
 * levels differ only by *nesting* (`.surface` → layer 1, `.surface .surface` →
 * layer 2, `.surface .surface .surface` → layer 3), so the bands nest in the DOM
 * to step colour; padding lives on the inner wrapper so nested bands stay flush
 * and full-width. Ported from the ds-global storybook decorators.
 *
 * @param level - this band's surface level (0-based).
 * @param renderAtLevel - the content to place at a given level.
 */
const SurfaceBand = ({
  level,
  renderAtLevel,
}: {
  level: number;
  renderAtLevel: (level: number) => ReactNode;
}): ReactElement => (
  <div
    className="surface"
    style={{
      background: "var(--surface-color-background, var(--color-background))",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
    }}
  >
    <div
      style={{
        paddingBlock: SURFACE_BAND_PADDING_BLOCK,
        paddingInline: SURFACE_BAND_PADDING_INLINE,
      }}
    >
      {renderAtLevel(level)}
    </div>
    {level < 2 ? (
      <SurfaceBand level={level + 1} renderAtLevel={renderAtLevel} />
    ) : null}
  </div>
);

/**
 * Renders `renderAtLevel` inside three stacked, equal `.surface` bands
 * (level 1 → 2 → 3) so a surface-aware control can be seen at each level. A
 * control that reads its `--surface-color-foreground-*` tokens steps with the
 * band; one that hard-codes flat colours blends in. The bands size to their
 * content. Ported from the ds-global storybook decorators.
 *
 * @param renderAtLevel - returns the node to place at a given level (0-based).
 */
export const surfaces = (
  renderAtLevel: (level: number) => ReactNode,
): ReactElement => <SurfaceBand level={0} renderAtLevel={renderAtLevel} />;
