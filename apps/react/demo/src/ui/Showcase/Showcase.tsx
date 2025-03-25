import { SHOWCASE_EXAMPLES } from "../../data/index.js";
import { Example } from "../Example/index.js";

const Showcase = () => {
  return (
    <Example examples={SHOWCASE_EXAMPLES}>
      <div>
        <Example.Renderer />
        <Example.Controls />
      </div>
    </Example>
  );
};

export default Showcase;
