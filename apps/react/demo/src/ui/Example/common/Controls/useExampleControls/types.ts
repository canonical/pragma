import type { ChangeEvent } from "react";
import type { ExampleControl } from "../../../types.js";

export type UseExampleControlsResult = {
  handleControlChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    control: ExampleControl,
  ) => void;
  handleCopyCss: () => void;
  handlePrevExample: () => void;
  handleNextExample: () => void;
};
