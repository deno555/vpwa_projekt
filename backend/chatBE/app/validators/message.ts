import vine from '@vinejs/vine'

/**
 * Odoslanie správy do kanála (WebSocket udalosť message:send)
 */
export const sendMessageValidator = vine.create({
  channelId: vine.number().withoutDecimals().positive(),
  content: vine.string().trim().minLength(1).maxLength(5000),
})

/**
 * Stránka histórie kanála (WebSocket udalosť message:list)
 */
export const listMessagesValidator = vine.create({
  channelId: vine.number().withoutDecimals().positive(),
  beforeId: vine.number().withoutDecimals().positive().optional(),
})
