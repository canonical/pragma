import { Button, TooltipArea } from "@canonical/react-ds-core";
import { lazy, Suspense, useState } from "react";
import canonicalLogo from "./assets/canonical.svg";
import reactLogo from "./assets/react.svg";
import "./Application.css";

const LazyButton = lazy(
  () =>
    new Promise((resolve) => {
      // @ts-ignore
      setTimeout(() => resolve(import("./LazyComponent.js")), 2000);
    }),
);

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a
          href="https://canonical.com"
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noreferrer"
        >
          <img src={canonicalLogo} className="logo" alt="Canonical logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Canonical Design System</h1>
      <h2>React Vite template</h2>
      <Suspense fallback={"Loading..."}>
        <LazyButton />
      </Suspense>
      <div className="card">
        <TooltipArea
          preferredDirections={["right", "bottom"]}
          Message={`Increment count to ${count + 1}`}
        >
          <Button onClick={() => setCount((count) => count + 1)}>
            Count: {count}
          </Button>
        </TooltipArea>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </>
  );
}

export default App;
