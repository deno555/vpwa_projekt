// --- HTTP klient pre backend (AdonisJS, /api/v1) ---

// Adresa sa dá zmeniť premennou QCLI_API_URL (v .env súbore frontendu alebo v termináli)
export const API_URL = (import.meta.env.QCLI_API_URL || 'http://localhost:3333/api/v1').replace(
	/\/$/,
	'',
);

const TOKEN_KEY = 'authToken';

/**
 * Token je v sessionStorage (každá karta môže mať iného používateľa)
 * a zároveň v localStorage (nová karta prevezme posledné prihlásenie).
 * @returns {string | null}
 */
export function getStoredToken() {
	if (typeof window === 'undefined') return null;
	return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
}

/** @param {string | null} token */
export function storeToken(token) {
	if (typeof window === 'undefined') return;
	if (token) {
		sessionStorage.setItem(TOKEN_KEY, token);
		localStorage.setItem(TOKEN_KEY, token);
	} else {
		sessionStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(TOKEN_KEY);
	}
}

export class ApiError extends Error {
	/**
	 * @param {number} status
	 * @param {string} message
	 * @param {any} body
	 */
	constructor(status, message, body) {
		super(message);
		this.status = status;
		this.body = body;
	}
}

/**
 * Vytiahne zrozumiteľnú chybovú správu z odpovede backendu
 * (validácia vracia { errors: [{ message }] }, ostatné { message } alebo { errors: [{ message }] }).
 * @param {any} body
 * @param {number} status
 */
function extractMessage(body, status) {
	if (body?.errors?.length && body.errors[0].message) return body.errors[0].message;
	if (body?.message) return body.message;
	if (status === 0) return 'Server je nedostupný. Skús to znova neskôr.';
	return 'Nastala neočakávaná chyba.';
}

/**
 * @param {string} path napr. '/auth/login'
 * @param {{ method?: string, body?: any, token?: string | null }} [options]
 * @returns {Promise<any>}
 */
export async function apiRequest(path, { method = 'GET', body, token = getStoredToken() } = {}) {
	/** @type {Record<string, string>} */
	const headers = { Accept: 'application/json' };
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (token) headers.Authorization = `Bearer ${token}`;

	let response;
	try {
		response = await fetch(API_URL + path, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	} catch {
		throw new ApiError(0, extractMessage(null, 0), null);
	}

	const text = await response.text();
	let data;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = null;
	}

	if (!response.ok) {
		throw new ApiError(response.status, extractMessage(data, response.status), data);
	}
	return data;
}
