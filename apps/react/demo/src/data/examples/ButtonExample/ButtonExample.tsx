import { Button } from "@canonical/react-ds-core";
import { useMemo } from "react";
import type { ShowcaseComponent } from "ui/index.js";
const ButtonExample: ShowcaseComponent = ({ numButtons }) => {
  const buttons = useMemo(() => {
    return Array.from({ length: numButtons }, (_, i) => (
      <Button
        type="button"
        // biome-ignore lint/suspicious/noArrayIndexKey: demonstrative purposes only
        key={i}
        label="Test button"
        onClick={() => alert("clicked!")}
      />
    ));
  }, [numButtons]);

  return (
    <div>
      {buttons.map((button, i) => (
        <div key={button.key}>{button}</div>
      ))}
    </div>
  );
};

export default ButtonExample;
