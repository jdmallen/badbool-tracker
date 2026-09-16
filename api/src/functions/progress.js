import { app } from "@azure/functions";
import { TableClient } from "@azure/data-tables";
import { decodePrincipal } from "../lib/principal.js";
import { validateProgressPayload } from "../lib/validate.js";
import { checkWriteAllowed } from "../lib/rateLimit.js";

const TABLE_NAME = process.env.TABLE_NAME ?? "progress";

let tableClientPromise;
function getTableClient() {
	if (!tableClientPromise) {
		const client = TableClient.fromConnectionString(process.env.TABLES_CONNECTION_STRING, TABLE_NAME);
		tableClientPromise = client
			.createTable()
			.catch(() => {}) // already exists
			.then(() => client);
	}
	return tableClientPromise;
}

// Best-effort, per-instance fast path so an obvious hammering client gets
// rejected without a storage round-trip. The persistent per-user caps in
// Table storage (checkWriteAllowed) are the real limit and survive restarts.
const lastWriteAtByUser = new Map();
const MIN_WRITE_INTERVAL_MS = 5000;

app.http("progress", {
	methods: ["GET", "PUT", "DELETE"],
	authLevel: "anonymous", // SWA's route rule ("authenticated") gates access before this runs
	route: "progress",
	handler: async (request, context) => {
		const principal = decodePrincipal(request);
		if (!principal) return { status: 401, jsonBody: { error: "Sign in required." } };

		const table = await getTableClient();

		if (request.method === "GET") {
			try {
				const entity = await table.getEntity(principal.userId, "progress");
				return { jsonBody: { version: entity.version, data: entity.data } };
			} catch (error) {
				if (error.statusCode === 404) return { jsonBody: { version: 0, data: null } };
				context.error(error);
				return { status: 500, jsonBody: { error: "Storage error" } };
			}
		}

		if (request.method === "DELETE") {
			try {
				await table.deleteEntity(principal.userId, "progress");
			} catch (error) {
				if (error.statusCode !== 404) {
					context.error(error);
					return { status: 500, jsonBody: { error: "Storage error" } };
				}
			}
			return { status: 204 };
		}

		// PUT
		const now = new Date();
		const lastWriteAt = lastWriteAtByUser.get(principal.userId);
		if (lastWriteAt && now.getTime() - lastWriteAt < MIN_WRITE_INTERVAL_MS) {
			return { status: 429, headers: { "Retry-After": "5" }, jsonBody: { error: "Too many requests" } };
		}

		let payload;
		try {
			payload = await request.json();
		} catch {
			return { status: 400, jsonBody: { error: "Invalid JSON body" } };
		}
		const validationError = validateProgressPayload(payload);
		if (validationError) return { status: 400, jsonBody: { error: validationError } };

		let entity = null;
		try {
			entity = await table.getEntity(principal.userId, "progress");
		} catch (error) {
			if (error.statusCode !== 404) {
				context.error(error);
				return { status: 500, jsonBody: { error: "Storage error" } };
			}
		}

		const currentVersion = entity?.version ?? 0;
		if (payload.baseVersion !== currentVersion) {
			return { status: 409, jsonBody: { version: currentVersion, data: entity?.data ?? null } };
		}

		const rateLimitResult = checkWriteAllowed(entity, now);
		if (!rateLimitResult.allowed) {
			return {
				status: 429,
				headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) },
				jsonBody: { error: "Rate limit exceeded" },
			};
		}

		const nextEntity = {
			partitionKey: principal.userId,
			rowKey: "progress",
			data: payload.data,
			version: currentVersion + 1,
			windowStart: new Date(rateLimitResult.nextCounters.windowStart).toISOString(),
			windowCount: rateLimitResult.nextCounters.windowCount,
			dayStart: new Date(rateLimitResult.nextCounters.dayStart).toISOString(),
			dayCount: rateLimitResult.nextCounters.dayCount,
		};

		try {
			if (entity) await table.updateEntity(nextEntity, "Replace", { etag: entity.etag });
			else await table.createEntity(nextEntity);
		} catch (error) {
			if (error.statusCode === 412) {
				// Lost a concurrent write race; ask the client to retry with fresh state.
				return { status: 409, jsonBody: { version: currentVersion, data: entity?.data ?? null } };
			}
			context.error(error);
			return { status: 500, jsonBody: { error: "Storage error" } };
		}

		lastWriteAtByUser.set(principal.userId, now.getTime());
		return { jsonBody: { version: nextEntity.version } };
	},
});
