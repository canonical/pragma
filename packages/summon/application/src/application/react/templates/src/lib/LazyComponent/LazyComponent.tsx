import { Button } from "@canonical/react-ds-global";

function LazyComponent() {
  return (
    <Button anticipation="constructive" onClick={() => alert("clicked!")}>
      Click me
    </Button>
  );
}

export default LazyComponent;
