import { Example } from "./common/index.js";
import "./styles.css";

const componentCssClassname = "ds showcase";

const Showcase = () => {
  return (
    <div className={componentCssClassname}>
      <Example>
        <Example.Renderer className="renderer" />
        <Example.Controls className="controls" />
      </Example>
    </div>
  );
};

export default Showcase;
