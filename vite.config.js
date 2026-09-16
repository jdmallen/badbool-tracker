import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

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
	},
});
