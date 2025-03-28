import { Button } from "@canonical/react-ds-core";
import { useMemo } from "react";
import { useWatch } from "react-hook-form";
const ButtonExample = () => {
  // Example of reading a non-css prop from the form state
  const { numButtons } = useWatch();

  const buttons = useMemo(() => {
    return Array.from({ length: numButtons }, (_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: Demonstrative purposes only
      <Button key={i} label="Test button" onClick={() => alert("clicked!")} />
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
