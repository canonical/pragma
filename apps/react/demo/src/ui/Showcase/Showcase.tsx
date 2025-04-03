import { Route } from "../../routes/showcase.js";
import { Example } from "./common/index.js";

const Showcase = () => {
  return (
    <Example queryParams={Route.useSearch()}>
      <Example.Renderer />
      <Example.Controls />
    </Example>
  );
};

export default Showcase;
