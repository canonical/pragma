import { createRouter, RouterProvider } from "@tanstack/react-router";
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
      {/** biome-ignore lint/correctness/useUniqueElementIds: Biome v2 TODO: fix */}
      <form id="form-root">
        <RouterProvider router={router} />
      </form>
    </FormProvider>
  );
}

export default App;
