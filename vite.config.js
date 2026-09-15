import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const progressFilePath = resolve(projectRoot, "data", "progress.json");
const maxBodyBytes = 1024 * 1024;

async function readProgress() {
	try {
		return await readFile(progressFilePath, "utf-8");
	} catch (error) {
		if (error.code === "ENOENT") return "{}";
		throw error;
	}
}

async function writeProgress(progress) {
	await mkdir(dirname(progressFilePath), { recursive: true });
	const temporaryPath = `${progressFilePath}.tmp`;
	await writeFile(temporaryPath, JSON.stringify(progress, null, "\t") + "\n", "utf-8");
	await rename(temporaryPath, progressFilePath);
}

function readRequestBody(request) {
	return new Promise((resolveBody, rejectBody) => {
		let body = "";
		request.setEncoding("utf-8");
		request.on("data", (chunk) => {
			body += chunk;
			if (body.length > maxBodyBytes) {
				rejectBody(new Error("Request body too large"));
				request.destroy();
			}
		});
		request.on("end", () => resolveBody(body));
		request.on("error", rejectBody);
	});
}

async function handleProgressRequest(request, response) {
	try {
		if (request.method === "GET") {
			response.setHeader("Content-Type", "application/json");
			response.end(await readProgress());
			return;
		}
		if (request.method === "PUT") {
			const progress = JSON.parse(await readRequestBody(request));
			if (typeof progress !== "object" || progress === null || Array.isArray(progress)) {
				throw new Error("Progress must be a JSON object");
			}
			await writeProgress(progress);
			response.statusCode = 204;
			response.end();
			return;
		}
		response.statusCode = 405;
		response.end();
	} catch (error) {
		response.statusCode = 400;
		response.end(String(error.message));
	}
}

// Persists progress to data/progress.json for both `vite` and `vite preview`
function progressApiPlugin() {
	// Block body: a returned function would be treated by Vite as a post-middleware hook
	const mountApi = (server) => {
		server.middlewares.use("/api/progress", handleProgressRequest);
	};
	return {
		name: "progress-api",
		configureServer: mountApi,
		configurePreviewServer: mountApi,
	};
}

export default defineConfig({
	plugins: [progressApiPlugin()],
	server: {
		watch: { ignored: ["**/data/**"] },
	},
});
