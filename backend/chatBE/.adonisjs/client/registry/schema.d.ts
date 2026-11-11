/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.new_account.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'teams.teams.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/teams'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['index']>>>
    }
  }
  'teams.teams.store': {
    methods: ["POST"]
    pattern: '/api/v1/teams'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/channel').createTeamValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/channel').createTeamValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'teams.teams.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/teams/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['destroy']>>>
    }
  }
  'teams.teams.leave': {
    methods: ["POST"]
    pattern: '/api/v1/teams/:id/leave'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['leave']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['leave']>>>
    }
  }
  'teams.teams.add_member': {
    methods: ["POST"]
    pattern: '/api/v1/teams/:id/members'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/channel').targetUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/channel').targetUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['addMember']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['addMember']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'teams.teams.join_channel': {
    methods: ["POST"]
    pattern: '/api/v1/teams/:id/channels'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/channel').joinChannelValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/channel').joinChannelValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['joinChannel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/teams_controller').default['joinChannel']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'channels.channels.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/channels/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['destroy']>>>
    }
  }
  'channels.channels.leave': {
    methods: ["POST"]
    pattern: '/api/v1/channels/:id/leave'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['leave']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['leave']>>>
    }
  }
  'channels.channels.invite': {
    methods: ["POST"]
    pattern: '/api/v1/channels/:id/invite'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/channel').targetUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/channel').targetUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['invite']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['invite']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'channels.channels.revoke': {
    methods: ["POST"]
    pattern: '/api/v1/channels/:id/revoke'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/channel').targetUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/channel').targetUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['revoke']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['revoke']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'channels.channels.kick': {
    methods: ["POST"]
    pattern: '/api/v1/channels/:id/kick'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/channel').targetUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/channel').targetUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['kick']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/channels_controller').default['kick']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
}
