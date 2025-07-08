import { buildSimpleModes, readModes } from "./utils";

const collection = "dimensions";
const modes = await readModes(collection);

await buildSimpleModes(collection, modes);
