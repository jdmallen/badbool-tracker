// Prints what cloud sync has actually stored, decoding the `data` column
// (a JSON progress document) instead of showing an opaque blob.
//
//   pnpm table:dump           summary per user
//   pnpm table:dump --json    raw entities
//
// Defaults to the azurite emulator; set TABLES_CONNECTION_STRING to point at a
// real account. Lives in api/ because that is where @azure/data-tables resolves.
import { TableClient } from "@azure/data-tables";

const connectionString = process.env.TABLES_CONNECTION_STRING ?? "UseDevelopmentStorage=true";
const tableName = process.env.TABLE_NAME ?? "progress";
const showRaw = process.argv.includes("--json");

const client = TableClient.fromConnectionString(connectionString, tableName);

function summarizeDocument(dataColumn) {
	if (!dataColumn) return null;
	try {
		const document = JSON.parse(dataColumn);
		const records = Object.values(document.entries ?? {});
		const countsByStatus = {};
		for (const record of records) {
			const status = record.status || "open";
			countsByStatus[status] = (countsByStatus[status] ?? 0) + 1;
		}
		return {
			total: records.length,
			countsByStatus,
			withNotes: records.filter((record) => record.notes).length,
		};
	} catch {
		return null;
	}
}

console.log(`${tableName} @ ${client.url}\n`);

let rowCount = 0;
try {
	for await (const entity of client.listEntities()) {
		rowCount += 1;

		if (showRaw) {
			console.log(JSON.stringify(entity, null, 2));
			continue;
		}

		const summary = summarizeDocument(entity.data);
		console.log(`user     ${entity.partitionKey}`);
		console.log(`row      ${entity.rowKey}  ·  version ${entity.version}  ·  updated ${entity.timestamp}`);

		if (summary) {
			const breakdown =
				Object.entries(summary.countsByStatus)
					.map(([status, count]) => `${count} ${status}`)
					.join(", ") || "none";
			const notes = summary.withNotes ? `, ${summary.withNotes} with notes` : "";
			console.log(`entries  ${summary.total} (${breakdown})${notes}`);
		} else {
			console.log("entries  <data column missing or not valid JSON>");
		}

		console.log(`writes   ${entity.windowCount ?? 0} this hour, ${entity.dayCount ?? 0} today`);
		console.log("");
	}
} catch (error) {
	if (error.statusCode === 404) {
		console.log(`Table "${tableName}" does not exist yet — nothing has synced.`);
		process.exit(0);
	}
	console.error(`Could not read the table: ${error.message}`);
	console.error("Is azurite running? Start it with `pnpm dev:storage` (or `pnpm dev:local`).");
	process.exit(1);
}

if (rowCount === 0) console.log("Table is empty — no user has synced yet.");
else if (!showRaw) console.log(`${rowCount} row(s). Re-run with --json for raw entities.`);
