/**
 * The cascade layer a generated stylesheet is wrapped in, and where that answer
 * comes from.
 *
 * It comes from the package being generated into, and from nowhere else. A
 * design system's layer names, its tiers and the file its order statement lives
 * in are that design system's business; a generator that knew them would be
 * carrying one house's vocabulary for everyone. So a package states its own:
 *
 *   "summon": {
 *     "componentLayer": "ds.components.apps-lxd",
 *     "layerOrderFrom": "@canonical/styles/layers.css"
 *   }
 *
 * `componentLayer` is the layer every stylesheet in that package is wrapped in.
 * `layerOrderFrom` is optional: a stylesheet that declares the order of every
 * layer, which the package's CSS entry imports before declaring its own, so the
 * name is placed after the ones that file fixes rather than wherever a bundler
 * happened to emit this package. Both are strings the generator copies; it does
 * not parse them, and it holds no opinion about what they say.
 *
 * A package that states neither gets stylesheets with no layer wrapper, which
 * is what a package outside any layered system wants.
 */

/** What a package may say about the layer its stylesheets belong in. */
export interface SummonLayerSettings {
  /** The layer every stylesheet in the package is wrapped in. */
  componentLayer?: string;
  /** A stylesheet declaring the layer order, imported before the layer is declared. */
  layerOrderFrom?: string;
}

/** The shape of a package manifest this module reads, and nothing more. */
export interface ManifestWithLayer {
  summon?: SummonLayerSettings;
}

/**
 * What a package says about its layer, read from its manifest.
 *
 * A manifest that says nothing returns empty settings rather than a default:
 * there is no layer a generator could pick that would be right for every house.
 *
 * Pure.
 */
export function layerSettingsFrom(
  manifest: ManifestWithLayer | undefined,
): SummonLayerSettings {
  const settings = manifest?.summon;
  return {
    componentLayer: settings?.componentLayer,
    layerOrderFrom: settings?.layerOrderFrom,
  };
}
