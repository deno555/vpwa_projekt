import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.profile.update_status': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'teams.teams.index': { paramsTuple?: []; params?: {} }
    'teams.teams.store': { paramsTuple?: []; params?: {} }
    'teams.teams.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.teams.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.teams.add_member': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.teams.join_channel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.kick': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'teams.teams.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'teams.teams.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.new_account.store': { paramsTuple?: []; params?: {} }
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'teams.teams.store': { paramsTuple?: []; params?: {} }
    'teams.teams.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.teams.add_member': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'teams.teams.join_channel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.leave': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.invite': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.kick': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'profile.profile.update_status': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'teams.teams.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'channels.channels.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}