/**
 * to load the built addon in this test Storybook
 */
function previewAnnotations(entry = []) {
	return [...entry, require.resolve("../dist/esm/preview.js")];
}

function managerEntries(entry = []) {
	return [...entry, require.resolve("../dist/esm/manager.js")];
}

module.exports = {
	managerEntries,
	previewAnnotations,
};
