import { Button } from "@canonical/react-ds-core";

function LazyComponent() {
  return (
    <Button
      appearance={"positive"}
      label={"Click me"}
      onClick={() => alert("clicked!")}
    />
  );
}

export default LazyComponent;