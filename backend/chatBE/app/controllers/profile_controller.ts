import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import { broadcastEvent } from '#services/realtime'
import type { UserStatus } from '#models/user'

const VALID_STATUSES: Record<string, UserStatus> = {
  ONLINE: 'ONLINE',
  MENTIONS: 'MENTIONS',
  DND: 'DND',
  OFFLINE: 'OFFLINE',
}

export default class ProfileController {
  async show({ auth, serialize }: HttpContext) {
    return serialize(UserTransformer.transform(auth.getUserOrFail()))
  }

  async updateStatus({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const rawStatus = String(request.input('status') || '').trim().toUpperCase()
    const status = VALID_STATUSES[rawStatus]

    if (!status) {
      return response.badRequest({
        message: 'Neplatný stav používateľa. Povolené: ONLINE, MENTIONS, DND, OFFLINE',
      })
    }

    user.status = status
    await user.save()

    broadcastEvent('user:status', {
      nickname: user.nickname,
      status: status.toLowerCase(),
    })

    return {
      message: 'Stav bol úspešne zmenený.',
      status: status.toLowerCase(),
    }
  }
}

