import type { HttpContext } from '@adonisjs/core/http'
import { targetUserValidator } from '#validators/channel'
import { finishAction } from '#services/action_response'
import {
  deleteChannelByAdmin,
  inviteToChannel,
  kickFromChannel,
  leaveChannel,
  revokeFromChannel,
} from '#services/channel_service'

export default class ChannelsController {
  /**
   * /quit – správca zruší kanál
   */
  async destroy({ auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    return finishAction(user, await deleteChannelByAdmin(user, Number(params.id)))
  }

  /**
   * /cancel – opustenie kanála (správca ním kanál zruší)
   */
  async leave({ auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    return finishAction(user, await leaveChannel(user, Number(params.id)))
  }

  /**
   * /invite nickName
   */
  async invite({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { nickname } = await request.validateUsing(targetUserValidator)
    return finishAction(user, await inviteToChannel(user, Number(params.id), nickname))
  }

  /**
   * /revoke nickName
   */
  async revoke({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { nickname } = await request.validateUsing(targetUserValidator)
    return finishAction(user, await revokeFromChannel(user, Number(params.id), nickname))
  }

  /**
   * /kick nickName
   */
  async kick({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { nickname } = await request.validateUsing(targetUserValidator)
    return finishAction(user, await kickFromChannel(user, Number(params.id), nickname))
  }
}
