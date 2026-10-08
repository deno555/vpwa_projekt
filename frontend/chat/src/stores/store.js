import { defineStore } from 'pinia'

// --- Prihlasovanie ---

/**
 * @typedef {{ username: string, password: string, name?: string, surname?: string, email?: string }} Account
 */

// Hardcoded účty na testovanie
/** @type {Account[]} */
const ACCOUNTS = [
  { username: 'denis', password: 'admin' },
  { username: 'jakub', password: 'admin' },
]

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
      await new Promise((resolve) => setTimeout(resolve, 500)) // simulate network delay

      const valid = this.accounts.some((a) => a.username === username && a.password === password)
      if (!valid) return false

      this.currentUser = username
      localStorage.setItem('currentUser', username)
      return true
    },
    /**
     * @param {Account} account
     * @returns {Promise<string | null>} chybová správa alebo null pri úspechu
     */
    async register(account) {
      await new Promise((resolve) => setTimeout(resolve, 500)) // simulate network delay

      if (this.accounts.some((a) => a.username === account.username)) {
        return 'Používateľ s touto prezývkou už existuje'
      }
      if (account.email && this.accounts.some((a) => a.email === account.email)) {
        return 'Používateľ s týmto emailom už existuje'
      }

      this.accounts.push(account)

      this.currentUser = account.username
      localStorage.setItem('currentUser', account.username)
      return null
    },
    logout() {
      this.currentUser = null
      localStorage.removeItem('currentUser')
    },
  },
})

// --- Správy ---

/**
 * @typedef {{ id: number, author: string, text: string, time: string }} Message
 */

function currentTime() {
  return new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
}

/**
 * @param {string} channel
 * @returns {Message}
 */
function welcomeMessage(channel) {
  return {
    id: 1,
    author: 'Systém',
    text: `Toto je prvá uvítacia správa v kanáli ${channel}.`,
    time: currentTime(),
  }
}

const savedHistory = localStorage.getItem('chatHistory')

export const useChatStore = defineStore('chat', {
  state: () => ({
    /** @type {Record<string, Message[]>} */
    history: savedHistory ? JSON.parse(savedHistory) : {},
  }),
  getters: {
    messagesFor: (state) => (/** @type {string} */ channel) =>
      state.history[channel] || [welcomeMessage(channel)],
  },
  actions: {
    /**
     * @param {string} channel
     * @param {string} rawText
     */
    sendMessage(channel, rawText) {
      const text = rawText.trim()
      if (text === '') return

      const auth = useAuthStore()

      // Ak pre tento kanál ešte nemáme pole správ, vytvoríme ho (spolu so systémovou správou)
      if (!this.history[channel]) {
        this.history[channel] = [welcomeMessage(channel)]
      }

      this.history[channel].push({
        id: Date.now(),
        author: auth.currentUser || 'Neznámy',
        text,
        time: currentTime(),
      })

      // Uložíme zmenenú históriu do LocalStorage
      localStorage.setItem('chatHistory', JSON.stringify(this.history))
    },
  },
})
