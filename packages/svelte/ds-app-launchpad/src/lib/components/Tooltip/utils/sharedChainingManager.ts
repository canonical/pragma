import { ChainingManager } from "./ChainingManager.js";

// The grace period is shared by every tooltip in the document: any tooltip
// closing starts it, so the next one opens without its own delay. Lives in
// its own module so tests can reset it between cases.
export const chainingManager = new ChainingManager(350);
