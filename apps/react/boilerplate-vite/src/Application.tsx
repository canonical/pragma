import { Button, withTooltip } from "@canonical/react-ds-global";
import { lazy, Suspense, useMemo, useState } from "react";
import canonicalLogo from "./assets/canonical.svg";
import reactLogo from "./assets/react.svg";
import "#styles/app.css";

const LazyButton = lazy(
  () =>
    new Promise((resolve) => {
      // @ts-expect-error
      setTimeout(() => resolve(import("./lib/LazyComponent/index.js")), 2000);
    }),
);

function App() {
  const [count, setCount] = useState(0);

  // `withTooltip` bakes the message + options in at wrap time, so re-wrap when
  // the count-dependent message changes. The Button's onClick reads the latest
  // count via the functional updater, so it stays correct across re-wraps.
  const CountButton = useMemo(
    () =>
      withTooltip(Button, `Increment count to ${count + 1}`, {
        preferredDirections: ["inline-end", "block-end"],
      }),
    [count],
  );

  return (
    <div className="grid responsive">
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
        <CountButton onClick={() => setCount((count) => count + 1)}>
          Count: {count}
        </CountButton>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </div>
  );
}

export default App;
