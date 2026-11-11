// --- WebSocket (socket.io) pripojenie na backend ---
import { io } from 'socket.io-client';
import { API_URL, getStoredToken } from './api.js';

// socket.io beží na rovnakom serveri ako REST API, iba bez cesty /api/v1
const SOCKET_URL = new URL(API_URL).origin;

/** Ako dlho čakáme na odpoveď servera (ack) */
const ACK_TIMEOUT_MS = 10000;

/** @type {import('socket.io-client').Socket | null} */
let socket = null;

/**
 * Pripojí sa (ak ešte nie je pripojený) s tokenom prihláseného používateľa.
 * @param {(socket: import('socket.io-client').Socket) => void} setup registrácia udalostí
 */
export function connectSocket(setup) {
	if (socket) return socket;
	socket = io(SOCKET_URL, {
		// Token sa číta pri každom (re)pripojení, aby sedel s aktuálnym prihlásením
		auth: (cb) => cb({ token: getStoredToken() }),
		transports: ['websocket'],
	});
	setup(socket);
	return socket;
}

export function disconnectSocket() {
	if (!socket) return;
	socket.disconnect();
	socket = null;
}

/**
 * Pošle udalosť a počká na odpoveď servera ({ ok, ...data } alebo { ok: false, error }).
 * @param {string} event
 * @param {Record<string, unknown>} payload
 * @returns {Promise<any>}
 */
export async function request(event, payload) {
	if (!socket) throw new Error('Nie si pripojený k serveru.');
	let response;
	try {
		response = await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload);
	} catch {
		throw new Error('Server neodpovedá. Skús to znova o chvíľu.');
	}
	if (!response?.ok) throw new Error(response?.error || 'Akcia zlyhala.');
	return response;
}

/**
 * Rýchle asynchrónne odoslanie udalosti (fire-and-forget, napr. pre indikátor písania).
 * @param {string} event
 * @param {unknown} payload
 */
export function emitEvent(event, payload) {
	if (socket && socket.connected) {
		socket.emit(event, payload);
	}
}

export function getSocket() {
	return socket;
}

