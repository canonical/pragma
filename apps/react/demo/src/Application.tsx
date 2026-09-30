import { FORM_DEFAULT_VALUES } from "data/index.js";
import { FormProvider, useForm } from "react-hook-form";
import { Showcase } from "ui/index.js";

function App() {
  const methods = useForm({
    mode: "onChange",
    defaultValues: FORM_DEFAULT_VALUES,
  });

  return (
    <FormProvider {...methods}>
      <form id="form-root">
        <Showcase />
      </form>
    </FormProvider>
  );
}

export default App;
