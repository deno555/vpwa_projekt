import { defineStore } from 'pinia';
import { isUserMentioned, triggerPing } from '../utils/notifications.js';
import { apiRequest, ApiError, getStoredToken, storeToken } from '../utils/api.js';

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
 * Tímy (servery) a kanály spravuje backend (/api/v1/teams, /api/v1/channels).
 * Správy sú zatiaľ uložené lokálne v prehliadači.
 *
 * @typedef {{ id: number, author: string, text: string, time: string, isSystem?: boolean }} Message
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

function currentTime() {
	return new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

/**
 * @param {string} channel
 * @returns {Message}
 */
function welcomeMessage(channel) {
	return {
		id: 1,
		author: 'Systém',
		text: `Toto je prvá uvítacia správa v kanáli #${channel}. Napíš /help pre zoznam dostupných príkazov.`,
		time: currentTime(),
		isSystem: true,
	};
}

/** @returns {Record<string, Message[]>} */
function loadStoredHistory() {
	try {
		return JSON.parse(localStorage.getItem('chatHistory') || '{}') || {};
	} catch {
		return {};
	}
}

/**
 * Uloží históriu zlúčenú s tou, ktorá už je v localStorage, aby karta so starou
 * kópiou (napr. offline používateľ) neprepísala správy, ktoré medzitým pribudli.
 * @param {Record<string, Message[]>} history
 */
function persistHistory(history) {
	const merged = loadStoredHistory();
	for (const [channel, messages] of Object.entries(history)) {
		const stored = merged[channel] || [];
		const storedIds = new Set(stored.map((m) => m.id));
		merged[channel] = [...stored, ...messages.filter((m) => !storedIds.has(m.id))];
	}
	localStorage.setItem('chatHistory', JSON.stringify(merged));
}

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
		/** @type {Record<string, Message[]>} */
		history: loadStoredHistory(),
		/** @type {Record<string, Record<string, number>>} */
		typingUsers: {},
		/** @type {Record<string, Record<string, string>>} */
		typingTexts: {},
		/** @type {Server[]} */
		servers: [],
		serversLoaded: false,
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
		messagesFor: (state) => (/** @type {string} */ channel) =>
			state.history[channel] || [welcomeMessage(channel)],
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
		/**
		 * Načíta servery a kanály prihláseného používateľa z backendu.
		 * Kanály, ktoré medzitým zanikli pre neaktivitu, oznámi layoutu.
		 */
		async loadServers() {
			const res = await apiRequest('/teams');
			/** @type {Server[]} */
			const servers = res.data;

			if (this.serversLoaded) {
				const limit = Date.now() - CHANNEL_INACTIVITY_LIMIT_MS;
				const stillThere = new Set(servers.flatMap((s) => s.channels.map((c) => c.id)));
				const expired = this.servers
					.flatMap((s) => s.channels)
					.filter((c) => !stillThere.has(c.id) && c.lastActivity < limit)
					.map((c) => c.name);
				this.servers = servers;
				if (expired.length > 0) this.applyExpiredChannels(expired);
			} else {
				this.servers = servers;
			}

			this.serversLoaded = true;
			if (!servers.some((s) => s.id === this.selectedServerId)) {
				this.selectedServerId = servers[0]?.id ?? null;
			}
		},

		/** Po odhlásení zahodí dáta predchádzajúceho používateľa */
		resetServers() {
			this.servers = [];
			this.serversLoaded = false;
		},

		/**
		 * Po zmene na backende načíta nový stav a oznámi to ostatným kartám.
		 */
		async refreshServers() {
			try {
				await this.loadServers();
			} catch {
				// ignore – ďalší pokus príde pri najbližšom obnovení
			}
			broadcast({ type: 'servers_changed' });
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

		/**
		 * Nastaví stav používateľa, uloží ho a rozpošle ostatným kartám.
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
				isSameUser(username, auth.currentUser)
			) {
				this.reloadFromStorage();
			}
		},

		reloadFromStorage() {
			this.history = loadStoredHistory();
			if (useAuthStore().isAuthenticated) void this.refreshServers();
		},

		/**
		 * Zaznamená novú správu v kanáli (posúva hranicu 30-dňovej neaktivity).
		 * @param {string} channelName
		 */
		touchChannel(channelName) {
			const info = this.findChannelByName(channelName);
			if (!info) return;
			info.channel.lastActivity = Date.now();
			apiRequest(`/channels/${info.channel.id}/activity`, { method: 'POST' }).catch(() => {
				// ignore – aktivita sa zaznamená pri ďalšej správe
			});
		},

		/**
		 * Odstráni históriu kanálov zaniknutých pre neaktivitu a oznámi to layoutu.
		 * @param {string[]} names
		 */
		applyExpiredChannels(names) {
			this.removeChannelHistory(names);
			this.lastExpiredChannels = names;
		},

		/**
		 * Zmaže históriu zrušeného kanála (/quit, /cancel správcom) a oznámi to ostatným kartám,
		 * aby nový kanál s rovnakým názvom nezačínal so starými správami.
		 * @param {string} name
		 */
		discardDeletedChannel(name) {
			this.removeChannelHistory([name]);
			broadcast({ type: 'channels_deleted', names: [name] });
		},

		/**
		 * Odstráni históriu kanálov (aj z localStorage, inak by ju persistHistory vrátil).
		 * @param {string[]} names
		 */
		removeChannelHistory(names) {
			// História je kľúčovaná názvom - nemažeme ju, ak kanál s rovnakým menom ešte existuje
			const stillUsed = new Set(
				this.servers.flatMap((s) => s.channels.map((c) => c.name.toLowerCase())),
			);
			const toDelete = names.filter((n) => !stillUsed.has(n.toLowerCase()));

			const history = { ...this.history };
			const stored = loadStoredHistory();
			for (const name of toDelete) {
				delete history[name];
				delete stored[name];
			}
			this.history = history;
			localStorage.setItem('chatHistory', JSON.stringify(stored));
		},

		/**
		 * @param {string} channel
		 * @param {string} text
		 */
		addSystemMessage(channel, text) {
			if (!this.history[channel]) {
				this.history[channel] = [welcomeMessage(channel)];
			}
			const msg = {
				id: Date.now() + Math.floor(Math.random() * 1000),
				author: 'Systém',
				text,
				time: currentTime(),
				isSystem: true,
			};
			this.history[channel].push(msg);
			persistHistory(this.history);
			broadcast({ type: 'new_message', channel, message: msg });
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
		},

		/**
		 * @param {string} channel
		 * @param {string} username
		 * @param {boolean} isTyping
		 * @param {number} [time]
		 * @param {string} [text]
		 */
		applyTyping(channel, username, isTyping, time = Date.now(), text = '') {
			const updated = { ...this.typingUsers[channel] };
			const updatedTexts = { ...this.typingTexts[channel] };
			if (isTyping) {
				updated[username] = time;
				updatedTexts[username] = text;
			} else {
				delete updated[username];
				delete updatedTexts[username];
			}
			this.typingUsers[channel] = updated;
			this.typingTexts[channel] = updatedTexts;
		},

		/**
		 * @param {string} channel
		 * @param {string} rawText
		 */
		sendMessage(channel, rawText) {
			const text = rawText.trim();
			if (text === '') return;

			const auth = useAuthStore();
			const currentUser = auth.currentUser || 'Neznámy';

			// Overenie členstva a banu
			if (this.isBanned(channel, currentUser)) {
				this.addSystemMessage(
					channel,
					`Nemôžeš odoslať správu, pretože máš v kanáli #${channel} trvalý ban.`,
				);
				return;
			}

			if (!this.isMember(channel, currentUser)) {
				this.addSystemMessage(
					channel,
					`Nie si členom kanála #${channel}. Ak sa chceš pridať, použi príkaz /join ${channel}.`,
				);
				return;
			}

			if (!this.history[channel]) {
				this.history[channel] = [welcomeMessage(channel)];
			}

			const msg = {
				id: Date.now(),
				author: currentUser,
				text,
				time: currentTime(),
			};

			this.history[channel].push(msg);
			persistHistory(this.history);
			this.touchChannel(channel);

			const chanInfo = this.findChannelByName(channel);
			const teamName = chanInfo?.server?.name || this.currentServer?.name || '';

			// Notifikácie dostávajú iba ostatní používatelia (bc.onmessage), nie odosielateľ
			broadcast({ type: 'new_message', channel, message: msg, team: teamName });
		},

		/**
		 * @param {string} channel
		 * @param {Message} message
		 */
		applyNewMessage(channel, message) {
			if (!this.history[channel]) {
				this.history[channel] = [welcomeMessage(channel)];
			}
			if (!this.history[channel].some((m) => m.id === message.id)) {
				this.history[channel].push(message);
				persistHistory(this.history);
			}
		},

		/**
		 * Zavolá akciu backendu, pridá systémovú správu do kanála a obnoví zoznam serverov.
		 * @param {string} path
		 * @param {{ method?: string, body?: any }} [options]
		 */
		async serverAction(path, options = { method: 'POST' }) {
			const res = await apiRequest(path, { method: 'POST', ...options });
			await this.refreshServers();
			if (res?.announcement && res.channel) {
				this.addSystemMessage(res.channel, res.announcement);
			}
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
						if (res.deleted) this.discardDeletedChannel(currentChannel.name);
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
							.map((m) =>
								isSameUser(m, currentChannel.admin) ? `👑 ${m} (správca)` : `• ${m}`,
							)
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
		// Offline používateľ nedostáva správy ani typing (načítajú sa po prepnutí na online)
		const isOffline = chatStore.currentUserStatus === 'offline';
		if (data.type === 'typing') {
			if (isOffline) return;
			if (data.isTyping && chatStore.statusOf(data.username) === 'offline') return;
			chatStore.applyTyping(data.channel, data.username, data.isTyping, data.time, data.text);
		} else if (data.type === 'new_message') {
			if (isOffline) return;
			chatStore.applyNewMessage(data.channel, data.message);

			const auth = useAuthStore();
			const me = auth.currentUser;
			if (!me) return;

			// Vlastné správy prijaté cez broadcast z inej karty/okna neoznamujeme
			if (isSameUser(data.message.author, me)) return;

			const myStatus = chatStore.currentUserStatus;

			// Nerušiť (dnd) -> žiadne notifikácie
			if (myStatus === 'dnd' || myStatus === 'offline') return;

			const chanInfo = chatStore.findChannelByName(data.channel);
			const teamName = data.team || chanInfo?.server?.name || '';
			const isMentioned = isUserMentioned(data.message.text, me);

			// V stave "mentions" (Iba označenia): notifikácia iba pri @označení
			// V stave "online": notifikácia pri každej správe (zvýraznená ak je označený)
			if (myStatus === 'mentions') {
				if (isMentioned) {
					triggerPing(data.channel, data.message, true, teamName);
				}
			} else if (myStatus === 'online') {
				triggerPing(data.channel, data.message, isMentioned, teamName);
			}
		} else if (data.type === 'servers_changed') {
			// Iná karta zmenila servery/kanály na backende – načítame aktuálny stav
			if (useAuthStore().isAuthenticated) {
				chatStore.loadServers().catch(() => {
					// ignore
				});
			}
		} else if (data.type === 'status_updated') {
			chatStore.applyUserStatus(data.username, data.status);
		} else if (data.type === 'channels_deleted') {
			chatStore.removeChannelHistory(data.names);
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
		if (event.key === 'chatHistory' && event.newValue) {
			try {
				const store = useChatStore();
				// Offline používateľ správy nedostáva
				if (store.currentUserStatus !== 'offline') {
					store.history = JSON.parse(event.newValue);
				}
			} catch {
				// ignore
			}
		}
	});
}
