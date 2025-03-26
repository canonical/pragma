import type { ChangeEvent } from "react";
import type { ExampleControl } from "../../../../types.js";

export interface ControlProps {
  control: ExampleControl;
  onChange?: (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => void;
}
