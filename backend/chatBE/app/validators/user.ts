import vine from '@vinejs/vine'

/**
 * Shared rules for email, nickname and password.
 */
const email = () => vine.string().trim().email().maxLength(254)
const nickname = () =>
  vine
    .string()
    .trim()
    .minLength(2)
    .maxLength(100)
    .regex(/^[a-zA-Z0-9_.-]+$/)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(255),
  surname: vine.string().trim().minLength(1).maxLength(255),
  nickname: nickname().unique({ table: 'users', column: 'nickname' }),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator to use before validating user credentials
 * during login (supports login via email or nickname)
 */
export const loginValidator = vine.create({
  uid: vine.string().trim().optional(),
  email: vine.string().trim().optional(),
  username: vine.string().trim().optional(),
  password: vine.string(),
})
