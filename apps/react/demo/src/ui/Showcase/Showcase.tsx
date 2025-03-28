import { SHOWCASE_EXAMPLES } from "data/index.js";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Example } from "./common/index.js";

const Showcase = () => {
  const defaultValues = useMemo(
    () =>
      SHOWCASE_EXAMPLES.map((example) =>
        Object.fromEntries(
          example.controls.map((control) => [
            control.name,
            // TODO read initial value from URL query params
            control.defaultValue,
          ]),
        ),
      ),
    [],
  );

  const methods = useForm({
    mode: "onChange",
    // TODO read the active example from URL query params
    defaultValues: defaultValues[0],
  });

  return (
    <FormProvider {...methods}>
      <Example items={SHOWCASE_EXAMPLES} defaultValues={defaultValues}>
        <Example.Renderer />
        <Example.Controls />
      </Example>
    </FormProvider>
  );
};

export default Showcase;
