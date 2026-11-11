import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class UsersController {
  /**
   * Vyhľadanie používateľa podľa prezývky (napr. pre /invite a /kick).
   * Porovnanie nerozlišuje veľkosť písmen (collation utf8mb4_unicode_ci).
   */
  async show({ params, response, serialize }: HttpContext) {
    const user = await User.findBy('nickname', String(params.nickname).trim())
    if (!user) {
      return response.notFound({ message: `Používateľ ${params.nickname} neexistuje.` })
    }

    return serialize(UserTransformer.transform(user))
  }
}
