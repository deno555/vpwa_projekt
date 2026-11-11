import type { ApplicationService } from '@adonisjs/core/types'
import type { Server, Socket } from 'socket.io'

/** Ako často server ruší kanály neaktívne viac ako 30 dní */
const EXPIRY_CHECK_MS = 60 * 1000

type Ack = (response: Record<string, unknown>) => void

/**
 * WebSocket (socket.io) pre správy v reálnom čase.
 *
 * Klient → server (s potvrdením / ack):
 *   message:send  { channelId, content }    → { ok, message } | { ok: false, error }
 *   message:list  { channelId, beforeId? }  → { ok, messages, hasMore } | { ok: false, error }
 *
 * Server → klient:
 *   message:new    nová správa v kanáli, ktorého je používateľ aktívnym členom
 *   teams:changed  zmenil sa zoznam serverov/kanálov (pozvánka, ban, zrušenie...)
 *
 * Aplikačné moduly (modely, služby) sa importujú až v ready(): providery sa načítavajú
 * pred inicializáciou služieb (napr. hash), ktoré modely pri importe potrebujú.
 */
export default class SocketProvider {
  #io: Server | null = null
  #expiryTimer: NodeJS.Timeout | null = null

  constructor(protected app: ApplicationService) {}

  async ready() {
    const server = await this.app.container.make('server')
    const nodeServer = server.getNodeServer()
    if (!nodeServer) return

    const { Server: SocketServer } = await import('socket.io')
    const { setIo } = await import('#services/realtime')

    this.#io = new SocketServer(nodeServer, {
      cors: { origin: this.app.inDev ? true : [], credentials: true },
    })
    setIo(this.#io)

    this.#io.use(async (socket, next) => {
      try {
        const user = await this.#authenticate(socket.handshake.auth?.token)
        socket.data.userId = user.id
        next()
      } catch {
        next(new Error('Unauthorized'))
      }
    })

    this.#io.on('connection', (socket) => void this.#onConnection(socket))

    this.#expiryTimer = setInterval(() => void this.#removeExpired(), EXPIRY_CHECK_MS)
  }

  async shutdown() {
    if (this.#expiryTimer) clearInterval(this.#expiryTimer)
    if (this.#io) {
      const { setIo } = await import('#services/realtime')
      setIo(null)
      await this.#io.close()
    }
  }

  /**
   * Overí rovnaký access token, aký klient používa pre REST API.
   */
  async #authenticate(token: unknown) {
    if (typeof token !== 'string' || !token) throw new Error('Missing token')
    const { Secret } = await import('@adonisjs/core/helpers')
    const { default: User } = await import('#models/user')
    const accessToken = await User.accessTokens.verify(new Secret(token))
    if (!accessToken) throw new Error('Invalid token')
    return User.findOrFail(accessToken.tokenableId)
  }

  async #onConnection(socket: Socket) {
    const { default: User } = await import('#models/user')
    const { userRoom } = await import('#services/realtime')
    const { listMessages, sendMessage } = await import('#services/message_service')
    const { listMessagesValidator, sendMessageValidator } = await import('#validators/message')

    const userId: number = socket.data.userId
    await socket.join(userRoom(userId))

    socket.on('message:send', (payload: unknown, ack?: Ack) =>
      this.#handle(ack, async () => {
        const { channelId, content } = await sendMessageValidator.validate(payload)
        const user = await User.findOrFail(userId)
        return { message: await sendMessage(user, channelId, content) }
      })
    )

    socket.on('message:list', (payload: unknown, ack?: Ack) =>
      this.#handle(ack, async () => {
        const { channelId, beforeId } = await listMessagesValidator.validate(payload)
        const user = await User.findOrFail(userId)
        return listMessages(user, channelId, beforeId)
      })
    )
  }

  /**
   * Spustí obsluhu udalosti a výsledok (alebo zrozumiteľnú chybu) vráti cez ack.
   */
  async #handle(ack: Ack | undefined, action: () => Promise<Record<string, unknown>>) {
    try {
      const result = await action()
      ack?.({ ok: true, ...result })
    } catch (error) {
      const { default: ActionException } = await import('#exceptions/action_exception')
      const { errors: vineErrors } = await import('@vinejs/vine')

      let message = 'Nastala neočakávaná chyba.'
      if (error instanceof ActionException) {
        message = error.message
      } else if (error instanceof vineErrors.E_VALIDATION_ERROR) {
        message = error.messages[0]?.message ?? 'Neplatné údaje.'
      } else {
        const logger = await this.app.container.make('logger')
        logger.error(error)
      }
      ack?.({ ok: false, error: message })
    }
  }

  async #removeExpired() {
    try {
      const { removeExpiredChannels } = await import('#services/channel_service')
      const { notifyTeamChanged } = await import('#services/realtime')
      const expired = await removeExpiredChannels()
      for (const teamId of new Set(expired.map((c) => c.teamId))) {
        await notifyTeamChanged(teamId)
      }
    } catch (error) {
      const logger = await this.app.container.make('logger')
      logger.error(error)
    }
  }
}
