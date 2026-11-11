import type { HttpContext } from '@adonisjs/core/http'
import { createTeamValidator, joinChannelValidator, targetUserValidator } from '#validators/channel'
import { finishAction } from '#services/action_response'
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
    const user = auth.getUserOrFail()
    const { name, type } = await request.validateUsing(createTeamValidator)
    response.status(201)
    return finishAction(user, await createTeam(user, name, type))
  }

  /**
   * /delete – zrušenie servera správcom
   */
  async destroy({ auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    return finishAction(user, await deleteTeam(user, Number(params.id)))
  }

  /**
   * Opustenie servera
   */
  async leave({ auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    return finishAction(user, await leaveTeam(user, Number(params.id)))
  }

  /**
   * Pridanie používateľa do servera
   */
  async addMember({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { nickname } = await request.validateUsing(targetUserValidator)
    return finishAction(user, await addTeamMember(user, Number(params.id), nickname))
  }

  /**
   * /join channelName [private] v rámci servera
   */
  async joinChannel({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { name, type } = await request.validateUsing(joinChannelValidator)
    return finishAction(user, await joinChannel(user, Number(params.id), name, type))
  }
}
