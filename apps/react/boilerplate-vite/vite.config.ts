import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	publicDir: path.resolve(__dirname, "src/assets"),
	plugins: [tsconfigPaths(), react()],
});
