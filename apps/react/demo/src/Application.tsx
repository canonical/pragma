import { useExampleRHFInterface } from "hooks/index.js";
import { FormProvider } from "react-hook-form";
import { Showcase } from "ui/index.js";

function App() {
  const { methods } = useExampleRHFInterface();

  return (
    <FormProvider {...methods}>
      <form id="form-root">
        <Showcase />
      </form>
    </FormProvider>
  );
}

export default App;
