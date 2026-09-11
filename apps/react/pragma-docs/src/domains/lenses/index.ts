// The lens domain's own surface. `definitions/` and `standards/` are sibling
// sub-domains with their own barrels; they are not re-exported here, because a
// barrel that flattened them would hide which domain owns a given lens.

export { default as LensPlaceholder } from "./LensPlaceholder.js";
export { default as lensRoutes } from "./routes.js";
