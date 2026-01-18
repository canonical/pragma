import { Button } from "@canonical/react-ds-global";

function LazyComponent() {
  return (
    <Button appearance={"positive"} onClick={() => alert("clicked!")}>
      Click me
    </Button>
  );
}

export default LazyComponent;
