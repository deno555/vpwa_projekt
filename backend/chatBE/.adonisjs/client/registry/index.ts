/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.new_account.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/signup',
    tokens: [{"old":"/api/v1/auth/signup","type":0,"val":"api","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['auth.new_account.store']['types'],
  },
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'teams.teams.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/teams',
    tokens: [{"old":"/api/v1/teams","type":0,"val":"api","end":""},{"old":"/api/v1/teams","type":0,"val":"v1","end":""},{"old":"/api/v1/teams","type":0,"val":"teams","end":""}],
    types: placeholder as Registry['teams.teams.index']['types'],
  },
  'teams.teams.store': {
    methods: ["POST"],
    pattern: '/api/v1/teams',
    tokens: [{"old":"/api/v1/teams","type":0,"val":"api","end":""},{"old":"/api/v1/teams","type":0,"val":"v1","end":""},{"old":"/api/v1/teams","type":0,"val":"teams","end":""}],
    types: placeholder as Registry['teams.teams.store']['types'],
  },
  'teams.teams.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/teams/:id',
    tokens: [{"old":"/api/v1/teams/:id","type":0,"val":"api","end":""},{"old":"/api/v1/teams/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/teams/:id","type":0,"val":"teams","end":""},{"old":"/api/v1/teams/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['teams.teams.destroy']['types'],
  },
  'teams.teams.leave': {
    methods: ["POST"],
    pattern: '/api/v1/teams/:id/leave',
    tokens: [{"old":"/api/v1/teams/:id/leave","type":0,"val":"api","end":""},{"old":"/api/v1/teams/:id/leave","type":0,"val":"v1","end":""},{"old":"/api/v1/teams/:id/leave","type":0,"val":"teams","end":""},{"old":"/api/v1/teams/:id/leave","type":1,"val":"id","end":""},{"old":"/api/v1/teams/:id/leave","type":0,"val":"leave","end":""}],
    types: placeholder as Registry['teams.teams.leave']['types'],
  },
  'teams.teams.add_member': {
    methods: ["POST"],
    pattern: '/api/v1/teams/:id/members',
    tokens: [{"old":"/api/v1/teams/:id/members","type":0,"val":"api","end":""},{"old":"/api/v1/teams/:id/members","type":0,"val":"v1","end":""},{"old":"/api/v1/teams/:id/members","type":0,"val":"teams","end":""},{"old":"/api/v1/teams/:id/members","type":1,"val":"id","end":""},{"old":"/api/v1/teams/:id/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['teams.teams.add_member']['types'],
  },
  'teams.teams.join_channel': {
    methods: ["POST"],
    pattern: '/api/v1/teams/:id/channels',
    tokens: [{"old":"/api/v1/teams/:id/channels","type":0,"val":"api","end":""},{"old":"/api/v1/teams/:id/channels","type":0,"val":"v1","end":""},{"old":"/api/v1/teams/:id/channels","type":0,"val":"teams","end":""},{"old":"/api/v1/teams/:id/channels","type":1,"val":"id","end":""},{"old":"/api/v1/teams/:id/channels","type":0,"val":"channels","end":""}],
    types: placeholder as Registry['teams.teams.join_channel']['types'],
  },
  'channels.channels.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/channels/:id',
    tokens: [{"old":"/api/v1/channels/:id","type":0,"val":"api","end":""},{"old":"/api/v1/channels/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/channels/:id","type":0,"val":"channels","end":""},{"old":"/api/v1/channels/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['channels.channels.destroy']['types'],
  },
  'channels.channels.leave': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/leave',
    tokens: [{"old":"/api/v1/channels/:id/leave","type":0,"val":"api","end":""},{"old":"/api/v1/channels/:id/leave","type":0,"val":"v1","end":""},{"old":"/api/v1/channels/:id/leave","type":0,"val":"channels","end":""},{"old":"/api/v1/channels/:id/leave","type":1,"val":"id","end":""},{"old":"/api/v1/channels/:id/leave","type":0,"val":"leave","end":""}],
    types: placeholder as Registry['channels.channels.leave']['types'],
  },
  'channels.channels.invite': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/invite',
    tokens: [{"old":"/api/v1/channels/:id/invite","type":0,"val":"api","end":""},{"old":"/api/v1/channels/:id/invite","type":0,"val":"v1","end":""},{"old":"/api/v1/channels/:id/invite","type":0,"val":"channels","end":""},{"old":"/api/v1/channels/:id/invite","type":1,"val":"id","end":""},{"old":"/api/v1/channels/:id/invite","type":0,"val":"invite","end":""}],
    types: placeholder as Registry['channels.channels.invite']['types'],
  },
  'channels.channels.revoke': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/revoke',
    tokens: [{"old":"/api/v1/channels/:id/revoke","type":0,"val":"api","end":""},{"old":"/api/v1/channels/:id/revoke","type":0,"val":"v1","end":""},{"old":"/api/v1/channels/:id/revoke","type":0,"val":"channels","end":""},{"old":"/api/v1/channels/:id/revoke","type":1,"val":"id","end":""},{"old":"/api/v1/channels/:id/revoke","type":0,"val":"revoke","end":""}],
    types: placeholder as Registry['channels.channels.revoke']['types'],
  },
  'channels.channels.kick': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/kick',
    tokens: [{"old":"/api/v1/channels/:id/kick","type":0,"val":"api","end":""},{"old":"/api/v1/channels/:id/kick","type":0,"val":"v1","end":""},{"old":"/api/v1/channels/:id/kick","type":0,"val":"channels","end":""},{"old":"/api/v1/channels/:id/kick","type":1,"val":"id","end":""},{"old":"/api/v1/channels/:id/kick","type":0,"val":"kick","end":""}],
    types: placeholder as Registry['channels.channels.kick']['types'],
  },
  'channels.channels.activity': {
    methods: ["POST"],
    pattern: '/api/v1/channels/:id/activity',
    tokens: [{"old":"/api/v1/channels/:id/activity","type":0,"val":"api","end":""},{"old":"/api/v1/channels/:id/activity","type":0,"val":"v1","end":""},{"old":"/api/v1/channels/:id/activity","type":0,"val":"channels","end":""},{"old":"/api/v1/channels/:id/activity","type":1,"val":"id","end":""},{"old":"/api/v1/channels/:id/activity","type":0,"val":"activity","end":""}],
    types: placeholder as Registry['channels.channels.activity']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
