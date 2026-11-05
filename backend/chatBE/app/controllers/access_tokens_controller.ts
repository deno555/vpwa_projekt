import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class AccessTokensController {
  async store({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)
    const identifier = payload.uid || payload.email || payload.username

    if (!identifier) {
      return response.badRequest({
        errors: [{ message: 'Email alebo prezývka je povinná.' }],
      })
    }

    const user = await User.verifyCredentials(identifier, payload.password)
    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }

  async destroy({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    return {
      message: 'Logged out successfully',
    }
  }
}
