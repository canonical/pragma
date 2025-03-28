import { RouterProvider, createRouter } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";
import { useGlobalForm } from "./hooks/index.js";
import { routeTree } from "./routeTree.gen.js";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const { methods } = useGlobalForm();

  return (
    <FormProvider {...methods}>
      <form>
        <RouterProvider router={router} />
      </form>
    </FormProvider>
  );
}

export default App;
