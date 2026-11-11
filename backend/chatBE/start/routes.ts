/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.patch('status', [controllers.Profile, 'updateStatus'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    // Tímy (servery) a ich kanály
    router
      .group(() => {
        router.get('/', [controllers.Teams, 'index'])
        router.post('/', [controllers.Teams, 'store'])
        router.delete(':id', [controllers.Teams, 'destroy'])
        router.post(':id/leave', [controllers.Teams, 'leave'])
        router.post(':id/members', [controllers.Teams, 'addMember'])
        router.post(':id/channels', [controllers.Teams, 'joinChannel'])
      })
      .prefix('teams')
      .as('teams')
      .where('id', router.matchers.number())
      .use(middleware.auth())

    router
      .group(() => {
        router.delete(':id', [controllers.Channels, 'destroy'])
        router.post(':id/leave', [controllers.Channels, 'leave'])
        router.post(':id/invite', [controllers.Channels, 'invite'])
        router.post(':id/revoke', [controllers.Channels, 'revoke'])
        router.post(':id/kick', [controllers.Channels, 'kick'])
      })
      .prefix('channels')
      .as('channels')
      .where('id', router.matchers.number())
      .use(middleware.auth())
  })
  .prefix('/api/v1')
