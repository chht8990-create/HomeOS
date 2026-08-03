export type AuthProvider = 'google'

export type AuthUser = {
  id: string
  provider: AuthProvider
  providerSubject?: string
  email: string
  emailVerified: boolean
  displayName: string
  avatarUrl?: string
  locale?: string
  createdAt: string
  updatedAt: string
}

export type AnonymousAuthSession = {
  status: 'anonymous'
  user: null
  expiresAt: null
}

export type AuthenticatedAuthSession = {
  status: 'authenticated'
  user: AuthUser
  deviceId: string
  expiresAt: string
}

export type AuthSession =
  | AnonymousAuthSession
  | AuthenticatedAuthSession

export type AuthState = {
  phase: 'loading' | 'ready' | 'error'
  session: AuthSession
  errorCode?: string
}
