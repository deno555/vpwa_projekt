import type { HttpContext } from '@adonisjs/core/http'
import { targetUserValidator } from '#validators/channel'
import {
  deleteChannelByAdmin,
  inviteToChannel,
  kickFromChannel,
  leaveChannel,
  revokeFromChannel,
  touchChannel,
} from '#services/channel_service'

export default class ChannelsController {
  /**
   * /quit – správca zruší kanál
   */
  async destroy({ auth, params }: HttpContext) {
    return deleteChannelByAdmin(auth.getUserOrFail(), Number(params.id))
  }

  /**
   * /cancel – opustenie kanála (správca ním kanál zruší)
   */
  async leave({ auth, params }: HttpContext) {
    return leaveChannel(auth.getUserOrFail(), Number(params.id))
  }

  /**
   * /invite nickName
   */
  async invite({ auth, params, request }: HttpContext) {
    const { nickname } = await request.validateUsing(targetUserValidator)
    return inviteToChannel(auth.getUserOrFail(), Number(params.id), nickname)
  }

  /**
   * /revoke nickName
   */
  async revoke({ auth, params, request }: HttpContext) {
    const { nickname } = await request.validateUsing(targetUserValidator)
    return revokeFromChannel(auth.getUserOrFail(), Number(params.id), nickname)
  }

  /**
   * /kick nickName
   */
  async kick({ auth, params, request }: HttpContext) {
    const { nickname } = await request.validateUsing(targetUserValidator)
    return kickFromChannel(auth.getUserOrFail(), Number(params.id), nickname)
  }

  /**
   * Nová správa v kanáli – posúva hranicu 30-dňovej neaktivity
   */
  async activity({ auth, params }: HttpContext) {
    return touchChannel(auth.getUserOrFail(), Number(params.id))
  }
}
