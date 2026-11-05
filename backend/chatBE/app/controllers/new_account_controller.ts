import User from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class NewAccountController {
  async store({ request, serialize }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)

    const user = await User.create({
      name: payload.name,
      surname: payload.surname,
      nickname: payload.nickname,
      email: payload.email,
      passwordHash: payload.password,
      status: 'OFFLINE',
    })

    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
