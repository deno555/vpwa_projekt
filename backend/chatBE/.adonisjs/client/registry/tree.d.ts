/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    newAccount: {
      store: typeof routes['auth.new_account.store']
    }
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  teams: {
    teams: {
      index: typeof routes['teams.teams.index']
      store: typeof routes['teams.teams.store']
      destroy: typeof routes['teams.teams.destroy']
      leave: typeof routes['teams.teams.leave']
      addMember: typeof routes['teams.teams.add_member']
      joinChannel: typeof routes['teams.teams.join_channel']
    }
  }
  channels: {
    channels: {
      destroy: typeof routes['channels.channels.destroy']
      leave: typeof routes['channels.channels.leave']
      invite: typeof routes['channels.channels.invite']
      revoke: typeof routes['channels.channels.revoke']
      kick: typeof routes['channels.channels.kick']
    }
  }
}
