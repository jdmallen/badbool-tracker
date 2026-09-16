let currentUser = null;

export async function loadAuthState() {
	try {
		const response = await fetch("/.auth/me");
		const payload = await response.json();
		const principal = payload?.clientPrincipal;
		currentUser = principal ? { provider: principal.identityProvider, username: principal.userDetails } : null;
	} catch {
		currentUser = null;
	}
	return currentUser;
}

export function getCurrentUser() {
	return currentUser;
}

// Rewritten to /.auth/login/github by staticwebapp.config.json
export function signInUrl() {
	return "/login";
}

export function signOutUrl() {
	return "/.auth/logout";
}
