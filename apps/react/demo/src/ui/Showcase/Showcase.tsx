import {
  ConfigProvider,
  ExampleControls,
  ExampleRenderer,
  SHOWCASE_EXAMPLES,
} from "./index.js";

const Showcase = () => {
  return (
    <ConfigProvider examples={SHOWCASE_EXAMPLES}>
      <div>
        <ExampleRenderer />
        <ExampleControls
          style={{
            position: "fixed",
            left: 0,
            bottom: 0,
          }}
        />
      </div>
    </ConfigProvider>
  );
};

export default Showcase;
