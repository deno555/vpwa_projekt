import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Chyba pri akcii používateľa (napr. "Iba správca môže zrušiť kanál").
 * Klientovi sa vráti ako { message } s daným HTTP stavom.
 */
export default class ActionException extends Exception {
  static status = 400

  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).send({ message: error.message })
  }
}

export function fail(message: string, status = 400) {
  return new ActionException(message, { status })
}
