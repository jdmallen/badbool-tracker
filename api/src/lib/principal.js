// SWA injects this header on requests it routes through; the function trusts
// only this header, never anything else on the request.
export function decodePrincipal(request) {
	const header = request.headers.get("x-ms-client-principal");
	if (!header) return null;
	try {
		const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
		if (decoded?.identityProvider !== "github" || !decoded?.userId) return null;
		return { userId: decoded.userId, provider: decoded.identityProvider, userDetails: decoded.userDetails };
	} catch {
		return null;
	}
}
