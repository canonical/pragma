import { Button } from "@canonical/react-ds-global";
import { useMemo } from "react";
import type { ShowcaseComponent } from "ui/index.js";

const ButtonExample: ShowcaseComponent = ({ numButtons }) => {
  const buttons = useMemo(() => {
    return Array.from({ length: numButtons }, (_, i) => (
      <Button
        type="button"
        // biome-ignore lint/suspicious/noArrayIndexKey: demonstrative purposes only
        key={i}
        onClick={() => alert("clicked!")}
      >
        Test button
      </Button>
    ));
  }, [numButtons]);

  return (
    <div>
      {buttons.map((button) => (
        <div key={button.key}>{button}</div>
      ))}
    </div>
  );
};

export default ButtonExample;
