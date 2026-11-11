import vine from '@vinejs/vine'

const visibility = () => vine.enum(['public', 'private'] as const).optional()

/**
 * /join channelName [private] – pripojenie do kanála alebo jeho vytvorenie
 */
export const joinChannelValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
  type: visibility(),
})

/**
 * Vytvorenie tímu (servera)
 */
export const createTeamValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(255),
  type: visibility(),
})

/**
 * Akcie nad iným používateľom (/invite, /revoke, /kick, pozvanie do tímu)
 */
export const targetUserValidator = vine.create({
  nickname: vine.string().trim().minLength(1).maxLength(100),
})
