import type { HttpContext } from '@adonisjs/core/http'
import { createTeamValidator, joinChannelValidator, targetUserValidator } from '#validators/channel'
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  joinChannel,
  leaveTeam,
  teamsForUser,
} from '#services/channel_service'

export default class TeamsController {
  /**
   * Tímy prihláseného používateľa a kanály, ktoré v nich vidí
   */
  async index({ auth }: HttpContext) {
    return { data: await teamsForUser(auth.getUserOrFail()) }
  }

  /**
   * /create <nazov servera> [private]
   */
  async store({ auth, request, response }: HttpContext) {
    const { name, type } = await request.validateUsing(createTeamValidator)
    response.status(201)
    return createTeam(auth.getUserOrFail(), name, type)
  }

  /**
   * /delete – zrušenie servera správcom
   */
  async destroy({ auth, params }: HttpContext) {
    return deleteTeam(auth.getUserOrFail(), Number(params.id))
  }

  /**
   * Opustenie servera
   */
  async leave({ auth, params }: HttpContext) {
    return leaveTeam(auth.getUserOrFail(), Number(params.id))
  }

  /**
   * Pridanie používateľa do servera
   */
  async addMember({ auth, params, request }: HttpContext) {
    const { nickname } = await request.validateUsing(targetUserValidator)
    return addTeamMember(auth.getUserOrFail(), Number(params.id), nickname)
  }

  /**
   * /join channelName [private] v rámci servera
   */
  async joinChannel({ auth, params, request }: HttpContext) {
    const { name, type } = await request.validateUsing(joinChannelValidator)
    return joinChannel(auth.getUserOrFail(), Number(params.id), name, type)
  }
}
