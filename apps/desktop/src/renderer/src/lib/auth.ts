import type { auth } from '@conar/api/src/lib/auth'
import {
  inferAdditionalFields,
  magicLinkClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { bearer } from 'better-auth/plugins'
import { createAuthClient } from 'better-auth/react'
import { toast } from 'sonner'
import { chatsCollection, chatsMessagesCollection } from '~/entities/chat'
import { databasesCollection } from '~/entities/database'
import { queriesCollection } from '~/entities/query/lib/sync'
import { identifyUser } from './events'
import { getApiUrl } from './utils'

export const CODE_CHALLENGE_KEY = 'conar.code_challenge'
export const BEARER_TOKEN_KEY = 'conar.bearer_token'

export const bearerToken = {
  get: () => localStorage.getItem(BEARER_TOKEN_KEY),
  set: (bearerToken: string) => localStorage.setItem(BEARER_TOKEN_KEY, bearerToken),
  remove: () => localStorage.removeItem(BEARER_TOKEN_KEY),
}

export const codeChallenge = {
  get: () => localStorage.getItem(CODE_CHALLENGE_KEY),
  set: (codeChallenge: string) => localStorage.setItem(CODE_CHALLENGE_KEY, codeChallenge),
  remove: () => localStorage.removeItem(CODE_CHALLENGE_KEY),
}

export function successAuthToast(newUser: boolean) {
  toast.success(
    newUser
      ? 'Welcome to Conar! We\'re excited to help you manage your connections with ease. Get started by creating your first connection.'
      : 'Welcome back! Your connections are ready for you.',
    {
      duration: 10000,
    },
  )
}

export const authClient = createAuthClient({
  baseURL: getApiUrl(),
  basePath: '/auth',
  plugins: [
    inferAdditionalFields<typeof auth>(),
    bearer(),
    organizationClient(),
    twoFactorClient(),
    magicLinkClient(),
  ],
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: () => bearerToken.get() ?? undefined,
    },
    headers: {
      'x-desktop': 'true',
    },
    async onError({ error }) {
      if (error.status === 401) {
        fullSignOut()
      }
    },
  },
})

export async function fullSignOut() {
  await authClient.signOut()
  bearerToken.remove()
  databasesCollection.cleanup()
  chatsCollection.cleanup()
  chatsMessagesCollection.cleanup()
  queriesCollection.cleanup()
  identifyUser(null)
}
