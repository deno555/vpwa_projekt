import type { Server } from 'socket.io'
import TeamMember from '#models/team_member'

/**
 * Prístup k socket.io serveru (vytvára ho providers/socket_provider.ts).
 * Každý pripojený klient je v miestnosti `user:<id>`, takže udalosti sa posielajú
 * konkrétnym používateľom – netreba synchronizovať miestnosti pri zmene členstva.
 */
let io: Server | null = null

export function setIo(server: Server | null) {
  io = server
}

export const userRoom = (userId: number) => `user:${userId}`

export function emitToUsers(userIds: number[], event: string, payload: unknown) {
  if (!io || userIds.length === 0) return
  io.to([...new Set(userIds)].map(userRoom)).emit(event, payload)
}

/**
 * Rozpošle udalosť všetkým pripojeným klientom (napr. zmena stavu používateľa).
 */
export function broadcastEvent(event: string, payload: unknown) {
  if (!io) return
  io.emit(event, payload)
}

/**
 * Oznámi členom tímu (a prípadne ďalším používateľom), že sa zmenil zoznam
 * serverov/kanálov – klient si ho znova načíta.
 */
export async function notifyTeamChanged(teamId: number, extraUserIds: number[] = []) {
  const members = await TeamMember.query().select('user_id').where('team_id', teamId)
  emitToUsers([...members.map((m) => m.userId), ...extraUserIds], 'teams:changed', { teamId })
}

export async function teamMemberIds(teamId: number) {
  const members = await TeamMember.query().select('user_id').where('team_id', teamId)
  return members.map((m) => m.userId)
}
