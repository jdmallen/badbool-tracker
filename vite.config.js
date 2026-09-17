import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	plugins: [vue()],
	build: {
		rollupOptions: {
			input: {
				main: resolve(projectRoot, "index.html"),
				privacy: resolve(projectRoot, "privacy.html"),
			},
		},
	},
	test: {
		environment: "happy-dom",
		// api-dist/ is the `pnpm deploy` bundle: a copy of api/, tests included.
		// Without this the api suites run twice, once from each location.
		exclude: [...configDefaults.exclude, "api-dist/**"],
	},
});
