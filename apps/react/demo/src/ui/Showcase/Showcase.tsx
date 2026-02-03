import { FormProvider } from "react-hook-form";
import { useExampleRHFInterface } from "../../hooks/index.js";
import { Controls, Provider, Renderer } from "./common/index.js";
import "./styles.css";

const componentCssClassname = "ds showcase";

const Showcase = () => {
  const { methods } = useExampleRHFInterface();

  return (
    <FormProvider {...methods}>
      <div className={componentCssClassname}>
        <Provider>
          <Renderer className="renderer" />
          <Controls className="controls" />
        </Provider>
      </div>
    </FormProvider>
  );
};

export default Showcase;
