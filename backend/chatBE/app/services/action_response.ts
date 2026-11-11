import type User from '#models/user'
import type { ActionResult } from '#services/channel_service'
import { postSystemMessage } from '#services/message_service'
import { emitToUsers, notifyTeamChanged } from '#services/realtime'

/**
 * Po úspešnej akcii uloží systémovú správu do kanála, cez WebSocket oznámi
 * dotknutým používateľom zmenu zoznamu kanálov a klientovi vráti iba verejné polia.
 */
export async function finishAction(user: User, result: ActionResult) {
  const { announcement, notifyUserIds, ...response } = result
  const { channelId, teamId } = result

  if (announcement && channelId) {
    await postSystemMessage(channelId, user.id, announcement)
  }

  if (teamId) {
    await notifyTeamChanged(teamId, notifyUserIds)
  } else if (notifyUserIds) {
    emitToUsers(notifyUserIds, 'teams:changed', {})
  }

  return response
}
