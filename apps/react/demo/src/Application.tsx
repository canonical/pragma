import { RouterProvider, createRouter } from "@tanstack/react-router";
import { useExampleRHFInterface } from "hooks/index.js";
import { FormProvider } from "react-hook-form";
import { routeTree } from "./routeTree.gen.js";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const { methods } = useExampleRHFInterface();

  return (
    <FormProvider {...methods}>
      <form id="form-root">
        <RouterProvider router={router} />
      </form>
    </FormProvider>
  );
}

export default App;
