import { defineStore } from 'pinia';
import { isUserMentioned, triggerPing } from '../utils/notifications.js';

// --- Prihlasovanie ---

/**
 * @typedef {{ username: string, password: string, name?: string, surname?: string, email?: string }} Account
 */

// Hardcoded účty na testovanie
/** @type {Account[]} */
const ACCOUNTS = [
  { username: 'denis', password: 'admin' },
  { username: 'jakub', password: 'admin' },
];

export const useAuthStore = defineStore('auth', {
  state: () => ({
    /** @type {string | null} */
    currentUser: localStorage.getItem('currentUser'),
    // Registrované účty sú len v pamäti – po refreshi sa stratia
    /** @type {Account[]} */
    accounts: [...ACCOUNTS],
  }),
  getters: {
    isAuthenticated: (state) => !!state.currentUser,
  },
  actions: {
    /**
     * @param {string} username
     * @param {string} password
     * @returns {Promise<boolean>}
     */
    async login(username, password) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // simulate network delay

      const valid = this.accounts.some((a) => a.username === username && a.password === password);
      if (!valid) return false;

      this.currentUser = username;
      localStorage.setItem('currentUser', username);
      return true;
    },
    /**
     * @param {Account} account
     * @returns {Promise<string | null>} chybová správa alebo null pri úspechu
     */
    async register(account) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // simulate network delay

      if (this.accounts.some((a) => a.username === account.username)) {
        return 'Používateľ s touto prezývkou už existuje';
      }
      if (account.email && this.accounts.some((a) => a.email === account.email)) {
        return 'Používateľ s týmto emailom už existuje';
      }

      this.accounts.push(account);

      this.currentUser = account.username;
      localStorage.setItem('currentUser', account.username);
      return null;
    },
    logout() {
      this.currentUser = null;
      localStorage.removeItem('currentUser');
    },
  },
});

// --- Správy, Servery a Kanály ---

/**
 * @typedef {{ id: number, author: string, text: string, time: string, isSystem?: boolean }} Message
 * @typedef {{
 *   id: number,
 *   name: string,
 *   type: 'public' | 'private',
 *   admin: string,
 *   members: string[],
 *   invited: string[],
 *   banned: string[],
 *   kicks: Record<string, string[]>
 * }} Channel
 * @typedef {{
 *   id: number,
 *   name: string,
 *   type: 'public' | 'private',
 *   admin: string,
 *   members: string[],
 *   channels: Channel[]
 * }} Server
 */

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

/** @type {Server[]} */
const INITIAL_SERVERS = [
  {
    id: 1,
    name: 'Dev Tím',
    type: 'public',
    admin: 'denis',
    members: ['denis', 'jakub'],
    channels: [
      {
        id: 1,
        name: 'všeobecný',
        type: 'public',
        admin: 'denis',
        members: ['denis', 'jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
      {
        id: 2,
        name: 'tajný-vývoj',
        type: 'private',
        admin: 'denis',
        members: ['denis'],
        invited: [],
        banned: [],
        kicks: {},
      },
      {
        id: 3,
        name: 'nová-kampaň',
        type: 'public',
        admin: 'jakub',
        members: ['jakub'],
        invited: ['denis'],
        banned: [],
        kicks: {},
      },
      {
        id: 4,
        name: 'off-topic',
        type: 'public',
        admin: 'denis',
        members: ['denis', 'jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
      {
        id: 15,
        name: 'komunita',
        type: 'public',
        admin: 'denis',
        members: ['denis'],
        invited: [],
        banned: [],
        kicks: {},
      },
    ],
  },
  {
    id: 2,
    name: 'Škola',
    type: 'public',
    admin: 'jakub',
    members: ['denis', 'jakub'],
    channels: [
      {
        id: 5,
        name: 'oznamy',
        type: 'public',
        admin: 'jakub',
        members: ['denis', 'jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
      {
        id: 6,
        name: 'vpwa',
        type: 'public',
        admin: 'denis',
        members: ['denis', 'jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
      {
        id: 7,
        name: 'projekt-tím',
        type: 'private',
        admin: 'jakub',
        members: ['jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
    ],
  },
  {
    id: 3,
    name: 'Gaming',
    type: 'public',
    admin: 'denis',
    members: ['denis', 'jakub'],
    channels: [
      {
        id: 8,
        name: 'lobby',
        type: 'public',
        admin: 'denis',
        members: ['denis', 'jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
      {
        id: 9,
        name: 'turnaj',
        type: 'public',
        admin: 'jakub',
        members: ['jakub'],
        invited: ['denis'],
        banned: [],
        kicks: {},
      },
      {
        id: 10,
        name: 'clips',
        type: 'public',
        admin: 'denis',
        members: ['denis', 'jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
    ],
  },
  {
    id: 4,
    name: 'Muzika',
    type: 'public',
    admin: 'denis',
    members: ['denis'],
    channels: [
      {
        id: 11,
        name: 'odporúčania',
        type: 'public',
        admin: 'denis',
        members: ['denis'],
        invited: [],
        banned: [],
        kicks: {},
      },
      {
        id: 12,
        name: 'playlisty',
        type: 'public',
        admin: 'denis',
        members: ['denis'],
        invited: [],
        banned: [],
        kicks: {},
      },
    ],
  },
  {
    id: 5,
    name: 'Anime Klub',
    type: 'public',
    admin: 'jakub',
    members: ['jakub'],
    channels: [
      {
        id: 13,
        name: 'diskusia',
        type: 'public',
        admin: 'jakub',
        members: ['jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
      {
        id: 14,
        name: 'spoilery',
        type: 'private',
        admin: 'jakub',
        members: ['jakub'],
        invited: [],
        banned: [],
        kicks: {},
      },
    ],
  },
];

function loadStoredServers() {
  const saved = localStorage.getItem('chatServers');
  const version = localStorage.getItem('chatDataVersion');
  const CURRENT_VERSION = '3';
  if (!saved || version !== CURRENT_VERSION) {
    localStorage.setItem('chatDataVersion', CURRENT_VERSION);
    localStorage.setItem('chatServers', JSON.stringify(INITIAL_SERVERS));
    return INITIAL_SERVERS;
  }
  try {
    const list = JSON.parse(saved);
    for (const s of list) {
      if (!Array.isArray(s.members)) {
        s.members = [s.admin];
      }
      for (const c of s.channels || []) {
        if (!Array.isArray(c.members)) c.members = [c.admin];
        if (!Array.isArray(c.invited)) c.invited = [];
        if (!Array.isArray(c.banned)) c.banned = [];
        if (!c.kicks) c.kicks = {};
      }
    }
    return list;
  } catch {
    return INITIAL_SERVERS;
  }
}

const savedHistory = localStorage.getItem('chatHistory');
const savedSelectedServerId = localStorage.getItem('chatSelectedServerId');

let bc = null;
if (typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined') {
  try {
    bc = new BroadcastChannel('vpwa_chat_sync');
  } catch {
    bc = null;
  }
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    /** @type {Record<string, Message[]>} */
    history: savedHistory ? JSON.parse(savedHistory) : {},
    /** @type {Record<string, Record<string, number>>} */
    typingUsers: {},
    /** @type {Server[]} */
    servers: loadStoredServers(),
    selectedServerId: savedSelectedServerId ? Number(savedSelectedServerId) : INITIAL_SERVERS[0].id,
  }),
  getters: {
    visibleServers: (state) => {
      const auth = useAuthStore();
      const currentUser = auth.currentUser;
      if (!currentUser) return [];
      return state.servers.filter((s) => {
        return (
          s.admin === currentUser || (Array.isArray(s.members) && s.members.includes(currentUser))
        );
      });
    },
    currentServer: (state) => {
      const auth = useAuthStore();
      const currentUser = auth.currentUser;
      const accessible = state.servers.filter((s) => {
        if (!currentUser) return true;
        return (
          s.admin === currentUser || (Array.isArray(s.members) && s.members.includes(currentUser))
        );
      });
      const found = accessible.find((s) => s.id === state.selectedServerId);
      return found || accessible[0] || state.servers[0] || INITIAL_SERVERS[0];
    },
    currentChannels: (state) => {
      const server = state.servers.find((s) => s.id === state.selectedServerId) || state.servers[0];
      return server ? server.channels : [];
    },
    messagesFor: (state) => (/** @type {string} */ channel) =>
      state.history[channel] || [welcomeMessage(channel)],
    typingUsersFor: (state) => (/** @type {string} */ channel) => {
      const channelMap = state.typingUsers[channel];
      if (!channelMap) return [];
      const now = Date.now();
      return Object.entries(channelMap)
        .filter(([, timestamp]) => now - timestamp < 3500)
        .map(([user]) => user);
    },
    isServerMember: () => (server, username) => {
      if (!server || !username) return false;
      return (
        server.admin === username ||
        (Array.isArray(server.members) && server.members.includes(username))
      );
    },
    hasChannelAccess: () => (channel, username) => {
      if (!channel || !username) return false;
      if (Array.isArray(channel.banned) && channel.banned.includes(username)) {
        return false;
      }
      if (channel.type === 'public') {
        return true;
      }
      return (
        channel.admin === username ||
        (Array.isArray(channel.members) && channel.members.includes(username)) ||
        (Array.isArray(channel.invited) && channel.invited.includes(username))
      );
    },
    findChannelByName: (state) => (/** @type {string} */ channelName) => {
      const name = String(channelName || '')
        .toLowerCase()
        .replace(/^#/, '');
      const auth = useAuthStore();
      const currentUser = auth.currentUser;
      const accessible = state.servers.filter((s) => {
        if (!currentUser) return true;
        return (
          s.admin === currentUser || (Array.isArray(s.members) && s.members.includes(currentUser))
        );
      });
      const curServer = accessible.find((s) => s.id === state.selectedServerId) || accessible[0];
      if (curServer) {
        const foundInCur = curServer.channels.find((c) => c.name.toLowerCase() === name);
        if (foundInCur) return { channel: foundInCur, server: curServer };
      }
      for (const server of accessible) {
        const found = server.channels.find((c) => c.name.toLowerCase() === name);
        if (found) return { channel: found, server };
      }
      return null;
    },
    isMember: (state) => (/** @type {string} */ channelName, /** @type {string} */ username) => {
      const name = String(channelName || '')
        .toLowerCase()
        .replace(/^#/, '');
      for (const server of state.servers) {
        const found = server.channels.find((c) => c.name.toLowerCase() === name);
        if (found) {
          return Array.isArray(found.members) && found.members.includes(username);
        }
      }
      return false;
    },
    isBanned: (state) => (/** @type {string} */ channelName, /** @type {string} */ username) => {
      const name = String(channelName || '')
        .toLowerCase()
        .replace(/^#/, '');
      for (const server of state.servers) {
        const found = server.channels.find((c) => c.name.toLowerCase() === name);
        if (found) {
          return Array.isArray(found.banned) && found.banned.includes(username);
        }
      }
      return false;
    },
  },
  actions: {
    saveServers() {
      localStorage.setItem('chatServers', JSON.stringify(this.servers));
      localStorage.setItem('chatSelectedServerId', String(this.selectedServerId));
      if (bc) {
        try {
          bc.postMessage({
            type: 'servers_updated',
            servers: this.servers,
            selectedServerId: this.selectedServerId,
          });
        } catch {
          // ignore
        }
      }
    },

    selectServer(serverId) {
      this.selectedServerId = serverId;
      this.saveServers();
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
      localStorage.setItem('chatHistory', JSON.stringify(this.history));
      if (bc) {
        try {
          bc.postMessage({
            type: 'new_message',
            channel,
            message: msg,
          });
        } catch {
          // ignore
        }
      }
    },

    /**
     * @param {string} channel
     * @param {string} username
     * @param {boolean} isTyping
     */
    setTyping(channel, username, isTyping) {
      const time = Date.now();
      this.applyTyping(channel, username, isTyping, time);

      if (bc) {
        try {
          bc.postMessage({
            type: 'typing',
            channel,
            username,
            isTyping,
            time,
          });
        } catch {
          // ignore
        }
      }
    },

    /**
     * @param {string} channel
     * @param {string} username
     * @param {boolean} isTyping
     * @param {number} [time]
     */
    applyTyping(channel, username, isTyping, time = Date.now()) {
      if (!this.typingUsers[channel]) {
        this.typingUsers[channel] = {};
      }
      const updated = { ...this.typingUsers[channel] };
      if (isTyping) {
        updated[username] = time;
      } else {
        delete updated[username];
      }
      this.typingUsers[channel] = updated;
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
      localStorage.setItem('chatHistory', JSON.stringify(this.history));

      if (bc) {
        try {
          bc.postMessage({
            type: 'new_message',
            channel,
            message: msg,
          });
        } catch {
          // ignore
        }
      }

      // Ak správa obsahuje @zmienku pre odosielateľa (napr. testovanie pingu samého seba)
      if (currentUser && isUserMentioned(msg.text, currentUser)) {
        triggerPing(channel, msg);
      }
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
        localStorage.setItem('chatHistory', JSON.stringify(this.history));
      }
    },

    /**
     * @param {number} serverId
     * @param {string} username
     */
    inviteUserToTeam(serverId, username) {
      const server = this.servers.find((s) => s.id === serverId);
      if (!server) return { success: false, message: 'Server neexistuje.' };
      if (!Array.isArray(server.members)) server.members = [];
      if (!server.members.includes(username)) {
        server.members.push(username);
      }
      const firstPub = server.channels.find((c) => c.type === 'public') || server.channels[0];
      if (firstPub) {
        if (!Array.isArray(firstPub.members)) firstPub.members = [];
        if (!firstPub.members.includes(username)) {
          firstPub.members.push(username);
        }
      }
      const auth = useAuthStore();
      const currentUser = auth.currentUser || 'Používateľ';
      this.addSystemMessage(
        firstPub?.name || 'všeobecný',
        `Používateľ ${currentUser} pridal používateľa ${username} do tímu "${server.name}".`,
      );
      this.saveServers();
      return {
        success: true,
        message: `Používateľ ${username} bol úspešne pridaný do tímu "${server.name}".`,
      };
    },

    /**
     * Spracovanie príkazov z príkazového riadka
     * @param {string} currentChannelName
     * @param {string} commandLine
     * @returns {{ success: boolean, message: string, redirectUrl?: string }}
     */
    executeCommand(currentChannelName, commandLine) {
      const auth = useAuthStore();
      const currentUser = auth.currentUser || 'Používateľ';
      const trimmed = commandLine.trim();
      const parts = trimmed.slice(1).split(/\s+/);
      const command = (parts[0] || '').toLowerCase();
      const args = parts.slice(1);

      const server = this.currentServer;
      const channelInfo = this.findChannelByName(currentChannelName);
      const currentChannel = channelInfo ? channelInfo.channel : null;

      switch (command) {
        // --- 1. /join channelName [private] ---
        case 'join': {
          if (args.length === 0 || !args[0]) {
            return { success: false, message: 'Použitie: /join <channelName> [private]' };
          }
          const rawName = args[0];
          const isPrivate = args.slice(1).some((a) => a.toLowerCase() === 'private');
          const formattedName = rawName.toLowerCase().replace(/^#/, '').replace(/\s+/g, '-');

          // Vyhľadanie v aktuálnom serveri
          const existing = server.channels.find((c) => c.name.toLowerCase() === formattedName);

          if (existing) {
            // Kontrola banu
            if (Array.isArray(existing.banned) && existing.banned.includes(currentUser)) {
              return {
                success: false,
                message: `Nemôžeš sa pripojiť do kanála #${existing.name}, pretože v ňom máš trvalý ban.`,
              };
            }

            // Kontrola súkromného kanála
            if (existing.type === 'private') {
              const hasAccess =
                existing.admin === currentUser ||
                (Array.isArray(existing.members) && existing.members.includes(currentUser)) ||
                (Array.isArray(existing.invited) && existing.invited.includes(currentUser));

              if (!hasAccess) {
                return {
                  success: false,
                  message: `Kanál #${existing.name} je súkromný. Vstup je povolený iba na pozvánku od správcu.`,
                };
              }
            }

            // Pridanie používateľa do zoznamu členov
            if (!Array.isArray(existing.members)) existing.members = [];
            if (!existing.members.includes(currentUser)) {
              existing.members.push(currentUser);
              this.addSystemMessage(
                existing.name,
                `Používateľ ${currentUser} sa pripojil do kanála #${existing.name}.`,
              );
            }

            if (!Array.isArray(server.members)) server.members = [];
            if (!server.members.includes(currentUser)) {
              server.members.push(currentUser);
            }

            this.saveServers();
            return {
              success: true,
              message: `Pripojil si sa do kanála #${existing.name}.`,
              redirectUrl: '/' + existing.name,
            };
          }

          // Ak kanál neexistuje, automaticky sa vytvorí
          /** @type {Channel} */
          const newChan = {
            id: Date.now(),
            name: formattedName,
            type: isPrivate ? 'private' : 'public',
            admin: currentUser,
            members: [currentUser],
            invited: [],
            banned: [],
            kicks: {},
          };

          server.channels.push(newChan);
          if (!Array.isArray(server.members)) server.members = [];
          if (!server.members.includes(currentUser)) {
            server.members.push(currentUser);
          }
          this.saveServers();
          this.addSystemMessage(
            newChan.name,
            `Používateľ ${currentUser} vytvoril nový ${newChan.type === 'private' ? 'súkromný' : 'verejný'} kanál #${newChan.name}.`,
          );

          return {
            success: true,
            message: `Kanál #${newChan.name} bol úspešne vytvorený a stal si sa jeho správcom.`,
            redirectUrl: '/' + newChan.name,
          };
        }

        // --- 2. /create <nazov servera> [private] ---
        case 'create': {
          if (args.length === 0) {
            return { success: false, message: 'Použitie: /create <nazov servera> [private]' };
          }
          const isPrivate = args[args.length - 1].toLowerCase() === 'private';
          const nameArgs = isPrivate ? args.slice(0, -1) : args;
          const serverName = nameArgs.join(' ').trim();

          if (!serverName) {
            return { success: false, message: 'Názov servera nemôže byť prázdny.' };
          }

          const defaultChannel = {
            id: Date.now() + 1,
            name: 'všeobecný',
            type: 'public',
            admin: currentUser,
            members: [currentUser],
            invited: [],
            banned: [],
            kicks: {},
          };

          /** @type {Server} */
          const newServer = {
            id: Date.now(),
            name: serverName,
            type: isPrivate ? 'private' : 'public',
            admin: currentUser,
            members: [currentUser],
            channels: [defaultChannel],
          };

          this.servers.push(newServer);
          this.selectedServerId = newServer.id;
          this.saveServers();

          return {
            success: true,
            message: `Server "${serverName}" bol vytvorený.`,
            redirectUrl: '/všeobecný',
          };
        }

        // --- 3. /delete (zrušenie servera správcom) ---
        case 'delete': {
          if (server.admin !== currentUser) {
            return {
              success: false,
              message: `Iba správca servera ("${server.admin}") môže zmazať tento server.`,
            };
          }

          const deletedName = server.name;
          this.servers = this.servers.filter((s) => s.id !== server.id);

          // Ak by nezostal žiadny server, obnovíme základný
          if (this.servers.length === 0) {
            this.servers = [...INITIAL_SERVERS];
          }

          const visible = this.visibleServers;
          const nextServer = visible[0] || this.servers[0];
          this.selectedServerId = nextServer.id;
          const fallbackChannel = nextServer.channels[0]?.name || 'všeobecný';
          this.saveServers();

          return {
            success: true,
            message: `Server "${deletedName}" bol úspešne zmazaný.`,
            redirectUrl: '/' + fallbackChannel,
          };
        }

        // --- 4. /invite nickName ---
        case 'invite': {
          if (args.length === 0 || !args[0]) {
            return { success: false, message: 'Použitie: /invite <nickName>' };
          }
          const targetNick = args[0].trim();

          if (targetNick === currentUser) {
            return { success: false, message: 'Nemôžeš pozvať sám seba.' };
          }

          if (!currentChannel) {
            return { success: false, message: 'Nie si v žiadnom kanáli.' };
          }

          // Používateľ je pridaný do zoznamu členov tímu (servera), aby videl tím
          if (!Array.isArray(server.members)) server.members = [];
          if (!server.members.includes(targetNick)) {
            server.members.push(targetNick);
          }

          // Ak je to súkromný kanál
          if (currentChannel.type === 'private') {
            if (currentChannel.admin !== currentUser) {
              return {
                success: false,
                message: 'Iba správca súkromného kanála môže pozývať používateľov.',
              };
            }

            if (
              Array.isArray(currentChannel.members) &&
              currentChannel.members.includes(targetNick)
            ) {
              return {
                success: false,
                message: `Používateľ ${targetNick} už je členom kanála #${currentChannel.name}.`,
              };
            }

            if (!Array.isArray(currentChannel.invited)) currentChannel.invited = [];
            if (!Array.isArray(currentChannel.members)) currentChannel.members = [];

            if (!currentChannel.invited.includes(targetNick)) {
              currentChannel.invited.push(targetNick);
            }

            this.saveServers();
            this.addSystemMessage(
              currentChannel.name,
              `Správca ${currentUser} pozval používateľa ${targetNick} do súkromného kanála #${currentChannel.name}.`,
            );

            return {
              success: true,
              message: `Používateľ ${targetNick} bol pozvaný do súkromného kanála #${currentChannel.name}.`,
            };
          }

          // Ak je to verejný kanál
          if (
            !Array.isArray(currentChannel.members) ||
            !currentChannel.members.includes(currentUser)
          ) {
            return {
              success: false,
              message: 'Musíš byť členom kanála, aby si mohol pozvať iného používateľa.',
            };
          }

          // Ak má cieľový používateľ trvalý ban:
          if (Array.isArray(currentChannel.banned) && currentChannel.banned.includes(targetNick)) {
            if (currentChannel.admin !== currentUser) {
              return {
                success: false,
                message: `Používateľ ${targetNick} má trvalý ban. Prístup mu môže obnoviť iba správca kanála (${currentChannel.admin}).`,
              };
            }

            // Správca obnovuje prístup
            currentChannel.banned = currentChannel.banned.filter((b) => b !== targetNick);
            if (currentChannel.kicks) delete currentChannel.kicks[targetNick];
            if (!currentChannel.members.includes(targetNick)) {
              currentChannel.members.push(targetNick);
            }

            this.saveServers();
            this.addSystemMessage(
              currentChannel.name,
              `Správca ${currentUser} obnovil prístup používateľovi ${targetNick} do kanála #${currentChannel.name}.`,
            );

            return {
              success: true,
              message: `Prístup do kanála #${currentChannel.name} pre používateľa ${targetNick} bol úspešne obnovený.`,
            };
          }

          // Bežné pozvanie do verejného kanála
          if (
            Array.isArray(currentChannel.members) &&
            currentChannel.members.includes(targetNick)
          ) {
            return {
              success: false,
              message: `Používateľ ${targetNick} už je členom kanála #${currentChannel.name}.`,
            };
          }

          if (!Array.isArray(currentChannel.invited)) currentChannel.invited = [];
          if (!Array.isArray(currentChannel.members)) currentChannel.members = [];

          if (!currentChannel.invited.includes(targetNick)) {
            currentChannel.invited.push(targetNick);
          }

          this.saveServers();
          this.addSystemMessage(
            currentChannel.name,
            `Používateľ ${currentUser} pozval ${targetNick} do kanála #${currentChannel.name}.`,
          );

          return {
            success: true,
            message: `Používateľ ${targetNick} bol pozvaný do kanála #${currentChannel.name}.`,
          };
        }

        // --- 5. /revoke nickName (iba správca v súkromnom kanáli) ---
        case 'revoke': {
          if (args.length === 0 || !args[0]) {
            return { success: false, message: 'Použitie: /revoke <nickName>' };
          }
          const targetNick = args[0].trim();

          if (!currentChannel) {
            return { success: false, message: 'Nie si v žiadnom kanáli.' };
          }

          if (currentChannel.type !== 'private') {
            return { success: false, message: 'Príkaz /revoke je určený iba pre súkromné kanály.' };
          }

          if (currentChannel.admin !== currentUser) {
            return {
              success: false,
              message: 'Iba správca súkromného kanála môže odoberať prístup používateľom.',
            };
          }

          if (targetNick === currentChannel.admin) {
            return { success: false, message: 'Správca kanála nemôže odobrať prístup sám sebe.' };
          }

          currentChannel.members = (currentChannel.members || []).filter((m) => m !== targetNick);
          currentChannel.invited = (currentChannel.invited || []).filter((i) => i !== targetNick);

          this.saveServers();
          this.addSystemMessage(
            currentChannel.name,
            `Správca ${currentUser} odobral prístup používateľovi ${targetNick} zo súkromného kanála #${currentChannel.name}.`,
          );

          return {
            success: true,
            message: `Používateľovi ${targetNick} bol odobraný prístup do kanála #${currentChannel.name}.`,
          };
        }

        // --- 6. /kick nickName ---
        case 'kick': {
          if (args.length === 0 || !args[0]) {
            return { success: false, message: 'Použitie: /kick <nickName>' };
          }
          const targetNick = args[0].trim();

          if (!currentChannel) {
            return { success: false, message: 'Nie si v žiadnom kanáli.' };
          }

          if (currentChannel.type === 'private') {
            return {
              success: false,
              message: 'V súkromnom kanáli použi príkaz /revoke <nickName>.',
            };
          }

          if (targetNick === currentUser) {
            return { success: false, message: 'Nemôžeš vyhodiť sám seba.' };
          }

          if (targetNick === currentChannel.admin) {
            return { success: false, message: 'Správca kanála nemôže byť vyhodený.' };
          }

          if (
            !Array.isArray(currentChannel.members) ||
            !currentChannel.members.includes(currentUser)
          ) {
            return {
              success: false,
              message: 'Iba členovia kanála môžu vyhadzovať iných používateľov.',
            };
          }

          if (!Array.isArray(currentChannel.banned)) currentChannel.banned = [];
          if (!currentChannel.kicks) currentChannel.kicks = {};

          if (currentChannel.banned.includes(targetNick)) {
            return {
              success: false,
              message: `Používateľ ${targetNick} už má v tomto kanáli trvalý ban.`,
            };
          }

          // Ak vyhadzuje správca -> okamžitý trvalý ban
          if (currentChannel.admin === currentUser) {
            currentChannel.banned.push(targetNick);
            currentChannel.members = (currentChannel.members || []).filter((m) => m !== targetNick);
            currentChannel.invited = (currentChannel.invited || []).filter((i) => i !== targetNick);
            delete currentChannel.kicks[targetNick];

            this.saveServers();
            this.addSystemMessage(
              currentChannel.name,
              `Správca ${currentUser} vyhodil používateľa ${targetNick} natrvalo (trvalý ban).`,
            );

            return {
              success: true,
              message: `Používateľ ${targetNick} bol natrvalo vyhodený správcom.`,
            };
          }

          // Ak vyhadzuje bežný člen -> hlasovanie (min. 3 členovia)
          if (!currentChannel.kicks[targetNick]) {
            currentChannel.kicks[targetNick] = [];
          }

          if (currentChannel.kicks[targetNick].includes(currentUser)) {
            return {
              success: false,
              message: `Už si hlasoval za vyhodenie používateľa ${targetNick}.`,
            };
          }

          currentChannel.kicks[targetNick].push(currentUser);
          const voteCount = currentChannel.kicks[targetNick].length;

          if (voteCount >= 3) {
            currentChannel.banned.push(targetNick);
            currentChannel.members = (currentChannel.members || []).filter((m) => m !== targetNick);
            currentChannel.invited = (currentChannel.invited || []).filter((i) => i !== targetNick);
            delete currentChannel.kicks[targetNick];

            this.saveServers();
            this.addSystemMessage(
              currentChannel.name,
              `Používateľ ${targetNick} bol vyhodený na základe 3 hlasov členov a dostal trvalý ban pre kanál #${currentChannel.name}.`,
            );

            return {
              success: true,
              message: `Používateľ ${targetNick} bol vyhodený (3 hlasy dosiahnuté) a má trvalý ban.`,
            };
          }

          this.saveServers();
          this.addSystemMessage(
            currentChannel.name,
            `Používateľ ${currentUser} hlasoval za vyhodenie ${targetNick} (${voteCount}/3).`,
          );

          return {
            success: true,
            message: `Hlas za vyhodenie používateľa ${targetNick} bol zaznamenaný (${voteCount}/3).`,
          };
        }

        // --- 7. /quit (zrušenie kanála správcom) ---
        case 'quit': {
          if (!currentChannel) {
            return { success: false, message: 'Nie si v žiadnom kanáli.' };
          }

          if (currentChannel.admin !== currentUser) {
            return {
              success: false,
              message: 'Iba správca kanála môže zrušiť kanál príkazom /quit.',
            };
          }

          const deletedChannelName = currentChannel.name;
          server.channels = server.channels.filter((c) => c.id !== currentChannel.id);

          if (server.channels.length === 0) {
            server.channels.push({
              id: Date.now(),
              name: 'všeobecný',
              type: 'public',
              admin: currentUser,
              members: [currentUser],
              invited: [],
              banned: [],
              kicks: {},
            });
          }

          const nextChannel =
            server.channels.find((c) => Array.isArray(c.members) && c.members.includes(currentUser))
              ?.name ||
            server.channels.find((c) => Array.isArray(c.invited) && c.invited.includes(currentUser))
              ?.name ||
            server.channels[0]?.name ||
            'všeobecný';
          this.saveServers();

          return {
            success: true,
            message: `Kanál #${deletedChannelName} bol zrušený správcom.`,
            redirectUrl: '/' + nextChannel,
          };
        }

        // --- 8. /cancel (zrušenie členstva v kanáli) ---
        case 'cancel': {
          if (!currentChannel) {
            return { success: false, message: 'Nie si v žiadnom kanáli.' };
          }

          // Ak /cancel spraví správca, kanál zaniká!
          if (currentChannel.admin === currentUser) {
            const deletedChannelName = currentChannel.name;
            server.channels = server.channels.filter((c) => c.id !== currentChannel.id);

            if (server.channels.length === 0) {
              server.channels.push({
                id: Date.now(),
                name: 'všeobecný',
                type: 'public',
                admin: currentUser,
                members: [currentUser],
                invited: [],
                banned: [],
                kicks: {},
              });
            }

            const nextChannel =
              server.channels.find(
                (c) => Array.isArray(c.members) && c.members.includes(currentUser),
              )?.name ||
              server.channels.find(
                (c) => Array.isArray(c.invited) && c.invited.includes(currentUser),
              )?.name ||
              server.channels[0]?.name ||
              'všeobecný';
            this.saveServers();

            return {
              success: true,
              message: `Ako správca si zrušil svoje členstvo, preto kanál #${deletedChannelName} zanikol.`,
              redirectUrl: '/' + nextChannel,
            };
          }

          // Ak je to bežný člen:
          currentChannel.members = (currentChannel.members || []).filter((m) => m !== currentUser);
          currentChannel.invited = (currentChannel.invited || []).filter((i) => i !== currentUser);

          this.saveServers();
          this.addSystemMessage(
            currentChannel.name,
            `Používateľ ${currentUser} zrušil svoje členstvo v kanáli #${currentChannel.name}.`,
          );

          const nextChannel =
            server.channels.find((c) => Array.isArray(c.members) && c.members.includes(currentUser))
              ?.name ||
            server.channels.find((c) => Array.isArray(c.invited) && c.invited.includes(currentUser))
              ?.name ||
            server.channels.find(
              (c) =>
                c.type === 'public' &&
                (!Array.isArray(c.banned) || !c.banned.includes(currentUser)),
            )?.name ||
            server.channels[0]?.name ||
            'všeobecný';

          return {
            success: true,
            message: `Zrušil si svoje členstvo v kanáli #${currentChannel.name}.`,
            redirectUrl: '/' + nextChannel,
          };
        }

        // --- 9. /list (zoznam členov kanála) ---
        case 'list': {
          if (!currentChannel) {
            return { success: false, message: 'Nie si v žiadnom kanáli.' };
          }

          if (
            !Array.isArray(currentChannel.members) ||
            !currentChannel.members.includes(currentUser)
          ) {
            return {
              success: false,
              message: `Musíš byť členom kanála #${currentChannel.name}, aby si si mohol pozrieť zoznam členov.`,
            };
          }

          const members = Array.isArray(currentChannel.members) ? currentChannel.members : [];
          const formatted = members
            .map((m) => (m === currentChannel.admin ? `👑 ${m} (správca)` : `• ${m}`))
            .join('\n');

          const message = `Zoznam členov kanála #${currentChannel.name} (${members.length}):\n${formatted}`;

          return {
            success: true,
            message,
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

          return {
            success: true,
            message: helpText,
          };
        }

        default: {
          return {
            success: false,
            message: `Neznámy príkaz: /${command}. Pre zoznam dostupných príkazov zadaj /help.`,
          };
        }
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
      chatStore.applyTyping(data.channel, data.username, data.isTyping, data.time);
    } else if (data.type === 'new_message') {
      chatStore.applyNewMessage(data.channel, data.message);
      const auth = useAuthStore();
      if (auth.currentUser && isUserMentioned(data.message.text, auth.currentUser)) {
        triggerPing(data.channel, data.message);
      }
    } else if (data.type === 'servers_updated') {
      chatStore.servers = data.servers;
      chatStore.selectedServerId = data.selectedServerId;
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'chatHistory' && event.newValue) {
      try {
        const store = useChatStore();
        store.history = JSON.parse(event.newValue);
      } catch {
        // ignore
      }
    }
    if (event.key === 'chatServers' && event.newValue) {
      try {
        const store = useChatStore();
        store.servers = JSON.parse(event.newValue);
      } catch {
        // ignore
      }
    }
    if (event.key === 'chatSelectedServerId' && event.newValue) {
      try {
        const store = useChatStore();
        store.selectedServerId = Number(event.newValue);
      } catch {
        // ignore
      }
    }
  });
}
