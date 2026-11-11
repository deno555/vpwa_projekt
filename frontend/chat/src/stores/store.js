import { defineStore } from 'pinia';
import { isUserMentioned, triggerPing } from '../utils/notifications.js';
import { apiRequest, ApiError, getStoredToken, storeToken } from '../utils/api.js';
import { connectSocket, disconnectSocket, request, emitEvent } from '../utils/socket.js';

// --- Pomocné funkcie pre používateľov ---

export function isSameUser(u1, u2) {
	if (!u1 || !u2) return false;
	return String(u1).trim().toLowerCase() === String(u2).trim().toLowerCase();
}

export function userListIncludes(list, user) {
	if (!Array.isArray(list) || !user) return false;
	const target = String(user).trim().toLowerCase();
	return list.some((item) => String(item).trim().toLowerCase() === target);
}

// --- Stav používateľa ---

/** @typedef {'online' | 'mentions' | 'dnd' | 'offline'} UserStatus */

/** @type {{ value: UserStatus, label: string, color: string, description?: string }[]} */
export const STATUS_OPTIONS = [
	{ value: 'online', label: 'Online', color: '#23a55a', description: 'Všetky upozornenia' },
	{
		value: 'mentions',
		label: 'Iba označenia',
		color: '#faa61a',
		description: 'Upozornenia iba pri @označení',
	},
	{ value: 'dnd', label: 'Nerušiť', color: '#f23f43', description: 'Žiadne upozornenia' },
	{ value: 'offline', label: 'Offline', color: '#80848e', description: 'Správy neprichádzajú' },
];

function statusKey(username) {
	return String(username || '')
		.trim()
		.toLowerCase();
}

/** @returns {Record<string, UserStatus>} */
function loadStoredStatuses() {
	try {
		return JSON.parse(localStorage.getItem('userStatuses') || '{}') || {};
	} catch {
		return {};
	}
}

// --- Prihlasovanie (backend /api/v1) ---

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   surname: string,
 *   nickname: string,
 *   email: string,
 *   initials: string
 * }} User
 *
 * @typedef {{
 *   name: string,
 *   surname: string,
 *   nickname: string,
 *   email: string,
 *   password: string,
 *   passwordConfirmation: string
 * }} SignupPayload
 */

export const useAuthStore = defineStore('auth', {
	state: () => ({
		/** @type {User | null} */
		user: null,
		/** @type {string | null} */
		token: getStoredToken(),
		initialized: false,
	}),
	getters: {
		/** Prezývka prihláseného používateľa – ostatné časti aplikácie pracujú s ňou */
		/** @returns {string | null} */
		currentUser: (state) => state.user?.nickname ?? null,
		isAuthenticated: (state) => !!state.token && !!state.user,
	},
	actions: {
		/**
		 * Po načítaní stránky overí uložený token a načíta profil používateľa.
		 */
		async init() {
			if (this.initialized) return;
			this.initialized = true;
			if (!this.token) return;

			try {
				const res = await apiRequest('/account/profile', { token: this.token });
				this.setUser(res.data);
			} catch (e) {
				// Neplatný / expirovaný token zahodíme
				if (e instanceof ApiError && e.status === 401) this.clearSession();
			}
		},

		/**
		 * @param {{ user: User, token: string }} session
		 */
		setSession({ user, token }) {
			this.token = token;
			storeToken(token);
			this.setUser(user);
		},

		/** @param {User} user */
		setUser(user) {
			this.user = user;
			if (user?.nickname && user?.status) {
				const chatStore = useChatStore();
				chatStore.applyUserStatus(user.nickname, user.status.toLowerCase());
			}
		},

		clearSession() {
			this.user = null;
			this.token = null;
			storeToken(null);
		},

		/**
		 * @param {string} login prezývka alebo email
		 * @param {string} password
		 * @returns {Promise<string | null>} chybová správa alebo null pri úspechu
		 */
		async login(login, password) {
			try {
				const res = await apiRequest('/auth/login', {
					method: 'POST',
					body: { uid: login.trim(), password },
					token: null,
				});
				this.setSession(res.data);
				return null;
			} catch (e) {
				if (e instanceof ApiError && e.status === 400) {
					return 'Nesprávne používateľské meno alebo heslo.';
				}
				return e instanceof Error ? e.message : 'Prihlásenie zlyhalo.';
			}
		},

		/**
		 * @param {SignupPayload} payload
		 * @returns {Promise<string | null>} chybová správa alebo null pri úspechu
		 */
		async register(payload) {
			try {
				const res = await apiRequest('/auth/signup', {
					method: 'POST',
					body: payload,
					token: null,
				});
				this.setSession(res.data);
				return null;
			} catch (e) {
				return e instanceof Error ? e.message : 'Registrácia zlyhala.';
			}
		},

		/**
		 * Zneplatní token na backende a odhlási používateľa aj lokálne.
		 */
		async logout() {
			try {
				if (this.token) await apiRequest('/account/logout', { method: 'POST' });
			} catch {
				// Aj keď server nie je dostupný, lokálne sa odhlásime
			} finally {
				this.clearSession();
			}
		},
	},
});

// --- Správy, Servery a Kanály ---

/**
 * Tímy (servery) a kanály spravuje backend cez REST (/api/v1/teams, /api/v1/channels).
 * Správy sa posielajú a prijímajú cez WebSocket (src/utils/socket.js).
 *
 * @typedef {{
 *   id: number,
 *   author: string,
 *   text: string,
 *   time: string,
 *   createdAt: string,
 *   isSystem?: boolean,
 *   isLocal?: boolean
 * }} Message
 * @typedef {{
 *   id: number,
 *   name: string,
 *   type: 'public' | 'private',
 *   admin: string,
 *   members: string[],
 *   invited: string[],
 *   banned: string[],
 *   kicks: Record<string, string[]>,
 *   lastActivity: number
 * }} Channel
 * @typedef {{
 *   id: number,
 *   name: string,
 *   type: 'public' | 'private',
 *   admin: string,
 *   members: string[],
 *   channels: Channel[]
 * }} Server
 * @typedef {{ success: boolean, message: string, redirectUrl?: string, newServerId?: number }} CommandResult
 */

// Kanál bez novej správy dlhšie ako 30 dní zaniká (stráži backend)
export const CHANNEL_INACTIVITY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000;

// Staré kľúče z obdobia, keď boli účty, servery a správy iba v prehliadači
if (typeof window !== 'undefined') {
	for (const key of [
		'chatHistory',
		'chatServers',
		'chatDataVersion',
		'registeredAccounts',
		'currentUser',
	]) {
		localStorage.removeItem(key);
	}
}

/**
 * Popis času správy: "Dnes o 14:05", "Včera o 9:30", "3. 11. 2026 o 18:00".
 * @param {Date} date
 */
function timeLabel(date) {
	const time = date.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	if (date.toDateString() === today.toDateString()) return `Dnes o ${time}`;
	if (date.toDateString() === yesterday.toDateString()) return `Včera o ${time}`;
	return `${date.toLocaleDateString('sk-SK')} o ${time}`;
}

/**
 * Správa z backendu v tvare, s ktorým pracujú komponenty.
 * @param {{ id: number, author: string, text: string, isSystem: boolean, createdAt: string }} raw
 * @returns {Message}
 */
function toMessage(raw) {
	return {
		id: raw.id,
		author: raw.author,
		text: raw.text,
		isSystem: raw.isSystem,
		createdAt: raw.createdAt,
		time: timeLabel(new Date(raw.createdAt)),
	};
}

let localMessageId = 0;

function loadSelectedServerId() {
	const saved = typeof window !== 'undefined' ? localStorage.getItem('chatSelectedServerId') : null;
	return saved ? Number(saved) : null;
}

/**
 * Prvý kanál servera, kam má zmysel používateľa presmerovať
 * (členstvo -> pozvánka -> verejný bez banu).
 * @param {Server | null | undefined} server
 * @param {string} username
 * @returns {string | null}
 */
export function firstChannelFor(server, username) {
	const channels = server?.channels || [];
	const notBanned = (/** @type {Channel} */ c) => !userListIncludes(c.banned, username);
	return (
		channels.find((c) => userListIncludes(c.members, username) && notBanned(c))?.name ||
		channels.find((c) => userListIncludes(c.invited, username) && notBanned(c))?.name ||
		channels.find((c) => c.type === 'public' && notBanned(c))?.name ||
		null
	);
}

/**
 * @param {unknown} e
 * @returns {CommandResult}
 */
function failure(e) {
	return { success: false, message: e instanceof Error ? e.message : 'Akcia zlyhala.' };
}

// BroadcastChannel synchronizuje medzi kartami iba "is typing" a stav používateľa
let bc = null;
if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
	try {
		bc = new BroadcastChannel('vpwa_chat_sync');
	} catch {
		bc = null;
	}
}

/** @param {Record<string, unknown>} data */
function broadcast(data) {
	if (!bc) return;
	try {
		bc.postMessage(data);
	} catch {
		// ignore
	}
}

export const useChatStore = defineStore('chat', {
	state: () => ({
		/** Načítané správy podľa ID kanála (od najstarších po najnovšie) */
		/** @type {Record<number, Message[]>} */
		history: {},
		/** Či má kanál na serveri ešte staršie správy */
		/** @type {Record<number, boolean>} */
		hasMore: {},
		/** @type {Record<string, Record<string, number>>} */
		typingUsers: {},
		/** @type {Record<string, Record<string, string>>} */
		typingTexts: {},
		/** @type {Server[]} */
		servers: [],
		serversLoaded: false,
		realtimeConnected: false,
		/** @type {number | null} ID aktuálne otvoreného kanála (pre Socket.io miestnosť) */
		activeChannelId: null,
		/** @type {number | null} */
		selectedServerId: loadSelectedServerId(),
		/** @type {Record<string, UserStatus>} */
		userStatuses: loadStoredStatuses(),
		/** @type {boolean} */
		leftDrawerOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
		/** @type {string[]} názvy kanálov, ktoré naposledy zanikli pre neaktivitu */
		lastExpiredChannels: [],
	}),
	getters: {
		statusOf: (state) => (/** @type {string} */ username) => {
			if (!username) return 'offline';
			return state.userStatuses[statusKey(username)] || 'online';
		},
		/** @returns {UserStatus} */
		currentUserStatus(state) {
			const auth = useAuthStore();
			const current = auth.currentUser;
			if (!current) return 'offline';
			return state.userStatuses[statusKey(current)] || 'online';
		},
		/** Backend vracia iba servery, ktorých je používateľ členom */
		visibleServers: (state) => state.servers,
		/** @returns {Server | null} */
		currentServer: (state) =>
			state.servers.find((s) => s.id === state.selectedServerId) || state.servers[0] || null,
		currentChannels() {
			return this.currentServer ? this.currentServer.channels : [];
		},
		/** @returns {(channelName: string) => Message[]} */
		messagesFor() {
			return (channelName) => {
				const id = this.findChannelByName(channelName)?.channel.id;
				return (id && this.history[id]) || [];
			};
		},
		/** @returns {(channelName: string) => boolean} */
		hasMoreFor() {
			return (channelName) => {
				const id = this.findChannelByName(channelName)?.channel.id;
				return !!id && !!this.hasMore[id];
			};
		},
		typingUsersFor: (state) => (/** @type {string} */ channel) => {
			const channelMap = state.typingUsers[channel];
			if (!channelMap) return [];
			const now = Date.now();
			return (
				Object.entries(channelMap)
					.filter(([, timestamp]) => now - timestamp < 3500)
					// Offline používateľ sa v "is typing" nezobrazuje
					.filter(
						([user]) =>
							(state.userStatuses[statusKey(user)] || 'offline') !== 'offline',
					)
					.map(([user]) => user)
			);
		},
		typingTextOf: (state) => (/** @type {string} */ channel, /** @type {string} */ username) =>
			state.typingTexts[channel]?.[username] || '',
		isServerMember: () => (server, username) => {
			if (!server || !username) return false;
			return isSameUser(server.admin, username) || userListIncludes(server.members, username);
		},
		hasChannelAccess: () => (channel, username) => {
			if (!channel || !username) return false;
			if (userListIncludes(channel.banned, username)) {
				return false;
			}
			if (channel.type === 'public') {
				return true;
			}
			return (
				isSameUser(channel.admin, username) ||
				userListIncludes(channel.members, username) ||
				userListIncludes(channel.invited, username)
			);
		},
		/**
		 * Kanál podľa názvu – najprv v aktuálnom serveri, potom v ostatných.
		 * @returns {(channelName: string) => { channel: Channel, server: Server } | null}
		 */
		findChannelByName() {
			return (channelName) => {
				const name = String(channelName || '')
					.toLowerCase()
					.replace(/^#/, '');
				const current = this.currentServer;
				const ordered = current
					? [current, ...this.servers.filter((s) => s.id !== current.id)]
					: this.servers;
				for (const server of ordered) {
					const found = server.channels.find((c) => c.name.toLowerCase() === name);
					if (found) return { channel: found, server };
				}
				return null;
			};
		},
		/** @returns {(channelId: number) => { channel: Channel, server: Server } | null} */
		findChannelById() {
			return (channelId) => {
				for (const server of this.servers) {
					const found = server.channels.find((c) => c.id === channelId);
					if (found) return { channel: found, server };
				}
				return null;
			};
		},
		isMember() {
			return (/** @type {string} */ channelName, /** @type {string} */ username) => {
				const info = this.findChannelByName(channelName);
				return !!info && userListIncludes(info.channel.members, username);
			};
		},
		isBanned() {
			return (/** @type {string} */ channelName, /** @type {string} */ username) => {
				const info = this.findChannelByName(channelName);
				return !!info && userListIncludes(info.channel.banned, username);
			};
		},
	},
	actions: {
		// --- Servery a kanály ---

		/**
		 * Načíta servery a kanály prihláseného používateľa z backendu.
		 * Kanály, ktoré medzitým zanikli pre neaktivitu, oznámi layoutu.
		 */
		async loadServers() {
			const res = await apiRequest('/teams');
			/** @type {Server[]} */
			const servers = res.data;

			const stillThere = new Set(servers.flatMap((s) => s.channels.map((c) => c.id)));
			const vanished = this.servers.flatMap((s) => s.channels).filter((c) => !stillThere.has(c.id));
			this.servers = servers;

			// Načítame reálne stavy členov serverov z databázy
			for (const s of servers) {
				if (s.userStatuses) {
					for (const [nick, stat] of Object.entries(s.userStatuses)) {
						this.applyUserStatus(nick, stat);
					}
				}
			}

			// Správy zmiznutých kanálov zahodíme (nový kanál s rovnakým názvom má iné ID)
			for (const channel of vanished) {
				delete this.history[channel.id];
				delete this.hasMore[channel.id];
			}
			const limit = Date.now() - CHANNEL_INACTIVITY_LIMIT_MS;
			const expired = vanished.filter((c) => c.lastActivity < limit).map((c) => c.name);
			if (this.serversLoaded && expired.length > 0) this.lastExpiredChannels = expired;

			this.serversLoaded = true;
			if (!servers.some((s) => s.id === this.selectedServerId)) {
				this.selectedServerId = servers[0]?.id ?? null;
			}
		},

		/**
		 * Po zmene na backende načíta nový stav (ostatné karty to zistia cez WebSocket).
		 */
		async refreshServers() {
			try {
				await this.loadServers();
			} catch {
				// ignore – ďalší pokus príde pri najbližšej zmene
			}
		},

		/** Po odhlásení zahodí dáta predchádzajúceho používateľa a odpojí WebSocket */
		resetServers() {
			disconnectSocket();
			this.realtimeConnected = false;
			this.activeChannelId = null;
			this.servers = [];
			this.serversLoaded = false;
			this.history = {};
			this.hasMore = {};
		},

		/** @param {number} serverId */
		selectServer(serverId) {
			this.selectedServerId = serverId;
			localStorage.setItem('chatSelectedServerId', String(serverId));
		},

		toggleLeftDrawer() {
			this.leftDrawerOpen = !this.leftDrawerOpen;
		},

		/**
		 * @param {boolean} open
		 */
		setLeftDrawer(open) {
			this.leftDrawerOpen = Boolean(open);
		},

		// --- WebSocket ---

		/**
		 * Pripojí sa na WebSocket: prijíma nové správy a zmeny zoznamu kanálov.
		 */
		connectRealtime() {
			let connectedBefore = false;
			connectSocket((socket) => {
				socket.on('connect', () => {
					this.realtimeConnected = true;
					// Po (re)pripojení sa znova prihlásime do miestnosti aktívneho kanála
					if (this.activeChannelId) {
						emitEvent('channel:join', this.activeChannelId);
					}
					// Po výpadku spojenia dočítame, čo sme medzitým zmeškali
					if (connectedBefore) void this.resync();
					connectedBefore = true;
				});
				socket.on('disconnect', () => {
					this.realtimeConnected = false;
				});
				socket.on('message:new', (payload) => this.receiveMessage(payload));
				socket.on('teams:changed', () => void this.refreshServers());
				socket.on('user:status', (payload) => {
					if (!payload?.nickname || !payload?.status) return;
					this.applyUserStatus(payload.nickname, payload.status);
				});
				socket.on('typing:update', (data) => {
					if (!data) return;
					// Offline používateľ indikátor písania nedostáva
					if (this.currentUserStatus === 'offline') return;
					const me = useAuthStore().currentUser;
					if (me && isSameUser(me, data.username)) return;

					const channelName =
						data.channelName || this.findChannelById(data.channelId)?.channel?.name;
					if (!channelName) return;

					this.applyTyping(
						channelName,
						data.username,
						data.isTyping,
						data.time || Date.now(),
						data.text || '',
					);
				});
			});
		},

		/**
		 * Znova načíta servery a správy otvorených kanálov (po výpadku alebo návrate z offline).
		 */
		async resync() {
			await this.refreshServers();
			const opened = Object.keys(this.history).map(Number);
			this.history = {};
			this.hasMore = {};
			await Promise.all(opened.map((id) => this.fetchMessages(id).catch(() => {})));
		},

		// --- Správy ---

		/**
		 * Načíta stránku histórie kanála (najnovšie, alebo staršie ako beforeId).
		 * @param {number} channelId
		 * @param {number} [beforeId]
		 */
		async fetchMessages(channelId, beforeId) {
			const res = await request('message:list', { channelId, beforeId });
			const page = res.messages.map(toMessage);
			const current = this.history[channelId] || [];
			// Staršie správy idú navrch, prvá stránka zachová lokálne hlášky príkazov
			this.history[channelId] = beforeId
				? [...page, ...current]
				: [...page, ...current.filter((m) => m.isLocal)];
			this.hasMore[channelId] = res.hasMore;
		},

		/**
		 * Pri otvorení kanála načíta jeho najnovšie správy (iba raz, potom chodia cez WebSocket).
		 * @param {string} channelName
		 * @param {{ force?: boolean }} [options]
		 */
		async openChannel(channelName, { force = false } = {}) {
			const channel = this.findChannelByName(channelName)?.channel;
			if (!channel) return;
			this.activeChannelId = channel.id;
			emitEvent('channel:join', channel.id);
			if (this.history[channel.id] && !force) return;
			try {
				await this.fetchMessages(channel.id);
			} catch {
				// Napr. súkromný kanál bez členstva – správy sa nezobrazia
				this.history[channel.id] = this.history[channel.id] || [];
				this.hasMore[channel.id] = false;
			}
		},

		/**
		 * Dočíta staršiu stránku správ (infinite scroll).
		 * @param {string} channelName
		 * @returns {Promise<boolean>} či sú na serveri ešte staršie správy
		 */
		async loadOlderMessages(channelName) {
			const channel = this.findChannelByName(channelName)?.channel;
			if (!channel || !this.hasMore[channel.id]) return false;
			const oldest = (this.history[channel.id] || []).find((m) => !m.isLocal);
			try {
				await this.fetchMessages(channel.id, oldest?.id);
			} catch {
				this.hasMore[channel.id] = false;
			}
			return !!this.hasMore[channel.id];
		},

		/**
		 * Pridá správu do načítanej histórie kanála (bez duplikátov).
		 * @param {number} channelId
		 * @param {Message} message
		 */
		appendMessage(channelId, message) {
			const list = this.history[channelId];
			if (!list) return; // história sa načíta celá pri otvorení kanála
			if (!list.some((m) => m.id === message.id)) list.push(message);
		},

		/**
		 * Nová správa z WebSocketu.
		 * @param {{ channelId: number, channelName: string, teamName: string } & Parameters<typeof toMessage>[0]} payload
		 */
		receiveMessage(payload) {
			// Offline používateľ správy nedostáva (dočítajú sa po prepnutí na online)
			if (this.currentUserStatus === 'offline') return;

			const message = toMessage(payload);
			this.appendMessage(payload.channelId, message);

			const me = useAuthStore().currentUser;
			// Vlastné správy (aj z inej karty) neoznamujeme
			if (!me || isSameUser(message.author, me)) return;

			const myStatus = this.currentUserStatus;
			// Nerušiť (dnd) -> žiadne notifikácie
			if (myStatus === 'dnd') return;

			const isMentioned = isUserMentioned(message.text, me);
			// V stave "mentions" (Iba označenia): notifikácia iba pri @označení
			// V stave "online": notifikácia pri každej správe (zvýraznená ak je označený)
			if (myStatus === 'mentions' && !isMentioned) return;
			triggerPing(payload.channelName, message, isMentioned, payload.teamName);
		},

		/**
		 * Odoslanie správy cez WebSocket – server overí členstvo a správu rozpošle členom.
		 * @param {string} channelName
		 * @param {string} rawText
		 */
		async sendMessage(channelName, rawText) {
			const text = rawText.trim();
			if (text === '') return;

			const currentUser = useAuthStore().currentUser || '';
			const channel = this.findChannelByName(channelName)?.channel;
			if (!channel) return;

			// Rýchla odozva bez čakania na server (server to overí aj sám)
			if (userListIncludes(channel.banned, currentUser)) {
				this.addSystemMessage(
					channelName,
					`Nemôžeš odoslať správu, pretože máš v kanáli #${channelName} trvalý ban.`,
				);
				return;
			}
			if (!userListIncludes(channel.members, currentUser)) {
				this.addSystemMessage(
					channelName,
					`Nie si členom kanála #${channelName}. Ak sa chceš pridať, použi príkaz /join ${channelName}.`,
				);
				return;
			}

			try {
				const res = await request('message:send', { channelId: channel.id, content: text });
				this.appendMessage(channel.id, toMessage(res.message));
			} catch (e) {
				this.addSystemMessage(channelName, e instanceof Error ? e.message : String(e));
			}
		},

		/**
		 * Lokálna hláška (výsledok príkazu) – vidí ju iba tento používateľ, neukladá sa.
		 * @param {string} channelName
		 * @param {string} text
		 */
		addSystemMessage(channelName, text) {
			const channel = this.findChannelByName(channelName)?.channel;
			if (!channel) return;
			if (!this.history[channel.id]) {
				this.history[channel.id] = [];
				this.hasMore[channel.id] = false;
			}
			const now = new Date();
			this.history[channel.id].push({
				id: -++localMessageId,
				author: 'Systém',
				text,
				isSystem: true,
				isLocal: true,
				createdAt: now.toISOString(),
				time: timeLabel(now),
			});
		},

		// --- Stav používateľa a "is typing" ---

		/**
		 * Nastaví stav používateľa, uloží ho do DB a rozpošle ostatným kartám aj klientom.
		 * @param {string} username
		 * @param {UserStatus} status
		 */
		setUserStatus(username, status) {
			if (!username) return;
			this.applyUserStatus(username, status);
			const stored = loadStoredStatuses();
			stored[statusKey(username)] = status;
			localStorage.setItem('userStatuses', JSON.stringify(stored));
			broadcast({ type: 'status_updated', username, status });

			// Ak mení stav prihlásený používateľ, zapíšeme to do DB cez API
			const auth = useAuthStore();
			if (auth.currentUser && isSameUser(auth.currentUser, username) && auth.token) {
				void apiRequest('/account/status', {
					method: 'PATCH',
					body: { status },
				}).catch(() => {});
			}
		},

		/**
		 * @param {string} username
		 * @param {UserStatus} status
		 */
		applyUserStatus(username, status) {
			const key = statusKey(username);
			const prev = this.userStatuses[key];
			this.userStatuses = { ...this.userStatuses, [key]: status };

			// Pri prechode do offline zrušíme jeho typing vo všetkých kanáloch
			if (status === 'offline') {
				for (const channel of Object.keys(this.typingUsers)) {
					if (
						Object.keys(this.typingUsers[channel] || {}).some((u) =>
							isSameUser(u, username),
						)
					) {
						const updated = { ...this.typingUsers[channel] };
						const updatedTexts = { ...this.typingTexts[channel] };
						for (const u of Object.keys(updated)) {
							if (isSameUser(u, username)) {
								delete updated[u];
								delete updatedTexts[u];
							}
						}
						this.typingUsers[channel] = updated;
						this.typingTexts[channel] = updatedTexts;
					}
				}
			}

			// Po návrate z offline načítame, čo medzitým pribudlo
			const auth = useAuthStore();
			if (
				prev === 'offline' &&
				status !== 'offline' &&
				isSameUser(username, auth.currentUser) &&
				auth.isAuthenticated &&
				this.serversLoaded
			) {
				void this.resync();
			}
		},

		/**
		 * @param {string} channel
		 * @param {string} username
		 * @param {boolean} isTyping
		 * @param {string} [text] rozpísaný text (náhľad pre ostatných)
		 */
		setTyping(channel, username, isTyping, text = '') {
			// Offline používateľ typing nevysiela
			if (isTyping && this.statusOf(username) === 'offline') isTyping = false;
			const time = Date.now();
			this.applyTyping(channel, username, isTyping, time, text);
			broadcast({
				type: 'typing',
				channel,
				username,
				isTyping,
				text: isTyping ? text : '',
				time,
			});

			const channelInfo = this.findChannelByName(channel);
			if (channelInfo?.channel?.id) {
				emitEvent('typing', {
					channelId: channelInfo.channel.id,
					channelName: channel,
					isTyping,
					text: isTyping ? text : '',
				});
			}
		},

		/**
		 * @param {string} channel
		 * @param {string} username
		 * @param {boolean} isTyping
		 * @param {number} [time]
		 * @param {string} [text]
		 */
		applyTyping(channel, username, isTyping, time = Date.now(), text = '') {
			const updated = { ...(this.typingUsers[channel] || {}) };
			const updatedTexts = { ...(this.typingTexts[channel] || {}) };
			if (isTyping) {
				updated[username] = time;
				updatedTexts[username] = text;
			} else {
				delete updated[username];
				delete updatedTexts[username];
			}
			this.typingUsers = { ...this.typingUsers, [channel]: updated };
			this.typingTexts = { ...this.typingTexts, [channel]: updatedTexts };
		},

		// --- Príkazy ---

		/**
		 * Zavolá akciu backendu a obnoví zoznam serverov.
		 * Systémovú správu do kanála (napr. "X sa pripojil") vytvorí a rozpošle backend.
		 * @param {string} path
		 * @param {{ method?: string, body?: any }} [options]
		 */
		async serverAction(path, options = { method: 'POST' }) {
			const res = await apiRequest(path, { method: 'POST', ...options });
			await this.refreshServers();
			return res;
		},

		/**
		 * Redirect po tom, ako používateľ prišiel o aktuálny kanál.
		 * @returns {string}
		 */
		fallbackUrl() {
			const name = firstChannelFor(this.currentServer, useAuthStore().currentUser || '');
			return '/' + (name || '');
		},

		/**
		 * @param {number} serverId
		 * @param {string} username
		 * @returns {Promise<CommandResult>}
		 */
		async inviteUserToTeam(serverId, username) {
			try {
				const res = await this.serverAction(`/teams/${serverId}/members`, {
					body: { nickname: username.trim() },
				});
				return { success: true, message: res.message };
			} catch (e) {
				return failure(e);
			}
		},

		/**
		 * Opustenie servera (správca ho môže iba zmazať cez /delete).
		 * @param {number} serverId
		 * @returns {Promise<CommandResult>}
		 */
		async leaveServer(serverId) {
			try {
				const res = await this.serverAction(`/teams/${serverId}/leave`);
				return { success: true, message: res.message, redirectUrl: this.fallbackUrl() };
			} catch (e) {
				return failure(e);
			}
		},

		/**
		 * Spracovanie príkazov z príkazového riadka (zmeny vykoná backend)
		 * @param {string} currentChannelName
		 * @param {string} commandLine
		 * @returns {Promise<CommandResult>}
		 */
		async executeCommand(currentChannelName, commandLine) {
			const trimmed = commandLine.trim();
			const parts = trimmed.slice(1).split(/\s+/);
			const command = (parts[0] || '').toLowerCase();
			const args = parts.slice(1);

			const server = this.currentServer;
			const channelInfo = this.findChannelByName(currentChannelName);
			const currentChannel = channelInfo ? channelInfo.channel : null;
			const currentUser = useAuthStore().currentUser || '';
			const target = (args[0] || '').trim();

			try {
				switch (command) {
					// --- 1. /join channelName [private] ---
					case 'join': {
						if (!target) {
							return { success: false, message: 'Použitie: /join <channelName> [private]' };
						}
						if (!server) {
							return {
								success: false,
								message: 'Najprv si vytvor server príkazom /create <nazov servera>.',
							};
						}
						const isPrivate = args.slice(1).some((a) => a.toLowerCase() === 'private');
						const res = await this.serverAction(`/teams/${server.id}/channels`, {
							body: { name: target, type: isPrivate ? 'private' : 'public' },
						});
						// Nové členstvo – načítame históriu kanála znova (predtým mohla byť nedostupná)
						await this.openChannel(res.channel, { force: true });
						return { success: true, message: res.message, redirectUrl: '/' + res.channel };
					}

					// --- 2. /create <nazov servera> [private] ---
					case 'create': {
						const isPrivate = args[args.length - 1]?.toLowerCase() === 'private';
						const serverName = (isPrivate ? args.slice(0, -1) : args).join(' ').trim();
						if (!serverName) {
							return {
								success: false,
								message: 'Použitie: /create <nazov servera> [private]',
							};
						}
						const res = await apiRequest('/teams', {
							method: 'POST',
							body: { name: serverName, type: isPrivate ? 'private' : 'public' },
						});
						this.selectServer(res.teamId);
						await this.refreshServers();
						return {
							success: true,
							message: res.message,
							redirectUrl: '/' + res.channel,
							newServerId: res.teamId,
						};
					}

					// --- 3. /delete (zrušenie servera správcom) ---
					case 'delete': {
						if (!server) return { success: false, message: 'Nie si v žiadnom serveri.' };
						const res = await this.serverAction(`/teams/${server.id}`, {
							method: 'DELETE',
						});
						return { success: true, message: res.message, redirectUrl: this.fallbackUrl() };
					}

					// --- 4. /invite nickName ---
					// --- 5. /revoke nickName (iba správca v súkromnom kanáli) ---
					// --- 6. /kick nickName ---
					case 'invite':
					case 'revoke':
					case 'kick': {
						if (!target) {
							return { success: false, message: `Použitie: /${command} <nickName>` };
						}
						if (!currentChannel) {
							return { success: false, message: 'Nie si v žiadnom kanáli.' };
						}
						const res = await this.serverAction(`/channels/${currentChannel.id}/${command}`, {
							body: { nickname: target },
						});
						return { success: true, message: res.message };
					}

					// --- 7. /quit (zrušenie kanála správcom) ---
					// --- 8. /cancel (zrušenie členstva v kanáli, správca ním kanál ruší) ---
					case 'quit':
					case 'cancel': {
						if (!currentChannel) {
							return { success: false, message: 'Nie si v žiadnom kanáli.' };
						}
						const res =
							command === 'quit'
								? await this.serverAction(`/channels/${currentChannel.id}`, {
										method: 'DELETE',
									})
								: await this.serverAction(`/channels/${currentChannel.id}/leave`);
						return { success: true, message: res.message, redirectUrl: this.fallbackUrl() };
					}

					// --- 9. /list (zoznam členov kanála) ---
					case 'list': {
						if (!currentChannel) {
							return { success: false, message: 'Nie si v žiadnom kanáli.' };
						}
						if (!userListIncludes(currentChannel.members, currentUser)) {
							return {
								success: false,
								message: `Musíš byť členom kanála #${currentChannel.name}, aby si si mohol pozrieť zoznam členov.`,
							};
						}
						const members = currentChannel.members;
						const formatted = members
							.map((m) => {
								const stat = (this.statusOf(m) || 'online').toUpperCase();
								const prefix = isSameUser(m, currentChannel.admin) ? `👑 ${m} (správca)` : `• ${m}`;
								return `${prefix} [${stat}]`;
							})
							.join('\n');
						return {
							success: true,
							message: `Zoznam členov kanála #${currentChannel.name} (${members.length}):\n${formatted}`,
						};
					}

					// --- 10. /help ---
					case 'help': {
						const helpText = [
							'Dostupné príkazy príkazového riadka:',
							'• /join <channelName> [private] – pripojenie do kanála alebo vytvorenie nového',
							'• /create <nazov servera> [private] – vytvorenie nového servera',
							'• /delete – zrušenie aktuálneho servera (iba správca servera)',
							'• /invite <nickName> – pozvanie používateľa (alebo správca verejného kanála: obnovenie banu)',
							'• /revoke <nickName> – odobratie prístupu v súkromnom kanáli (iba správca)',
							'• /kick <nickName> – vyhodenie používateľa (3 hlasy = trvalý ban; správca = okamžitý trvalý ban)',
							'• /quit – zatvorenie/zrušenie kanála (iba správca kanála)',
							'• /cancel – zrušenie vlastného členstva (ak si správca, kanál zaniká)',
							'• /list – zobrazenie zoznamu členov aktuálneho kanála',
						].join('\n');
						return { success: true, message: helpText };
					}

					default: {
						return {
							success: false,
							message: `Neznámy príkaz: /${command}. Pre zoznam dostupných príkazov zadaj /help.`,
						};
					}
				}
			} catch (e) {
				return failure(e);
			}
		},
	},
});

if (bc) {
	bc.onmessage = (event) => {
		const data = event.data;
		if (!data) return;
		const chatStore = useChatStore();
		if (data.type === 'typing') {
			// Offline používateľ nedostáva typing
			if (chatStore.currentUserStatus === 'offline') return;
			if (data.isTyping && chatStore.statusOf(data.username) === 'offline') return;
			chatStore.applyTyping(data.channel, data.username, data.isTyping, data.time, data.text);
		} else if (data.type === 'status_updated') {
			chatStore.applyUserStatus(data.username, data.status);
		}
	};
}

if (typeof window !== 'undefined') {
	window.addEventListener('storage', (event) => {
		if (event.key === 'userStatuses' && event.newValue) {
			try {
				const store = useChatStore();
				const statuses = JSON.parse(event.newValue) || {};
				for (const [username, status] of Object.entries(statuses)) {
					if (store.userStatuses[username] !== status) {
						store.applyUserStatus(username, status);
					}
				}
			} catch {
				// ignore
			}
		}
	});
}
