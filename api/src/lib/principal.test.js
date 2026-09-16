import { describe, expect, it } from "vitest";
import { decodePrincipal } from "./principal.js";

function requestWithHeader(value) {
	return { headers: { get: (name) => (name === "x-ms-client-principal" ? value : null) } };
}

function encode(principal) {
	return Buffer.from(JSON.stringify(principal), "utf-8").toString("base64");
}

describe("decodePrincipal", () => {
	it("returns null when the header is missing", () => {
		expect(decodePrincipal(requestWithHeader(null))).toBeNull();
	});

	it("returns null for malformed base64/JSON", () => {
		expect(decodePrincipal(requestWithHeader("not-valid-base64-json"))).toBeNull();
	});

	it("returns null for a non-GitHub provider", () => {
		const header = encode({ identityProvider: "aad", userId: "abc123", userDetails: "someone" });
		expect(decodePrincipal(requestWithHeader(header))).toBeNull();
	});

	it("returns null when userId is missing", () => {
		const header = encode({ identityProvider: "github", userDetails: "someone" });
		expect(decodePrincipal(requestWithHeader(header))).toBeNull();
	});

	it("decodes a valid GitHub principal", () => {
		const header = encode({ identityProvider: "github", userId: "abc123", userDetails: "someone" });
		expect(decodePrincipal(requestWithHeader(header))).toEqual({ userId: "abc123", provider: "github", userDetails: "someone" });
	});
});
