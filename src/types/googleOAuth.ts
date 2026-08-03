import type { VerifiedGoogleIdentity } from './serverIdentity.js'

export type GoogleOAuthEnvironment = {
  GOOGLE_OAUTH_CLIENT_ID?: string
  GOOGLE_OAUTH_CLIENT_SECRET?: string
  GOOGLE_OAUTH_REDIRECT_URI?: string
  AUTH_COOKIE_SECRET?: string
  DATABASE_URL?: string
}

export type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  cookieSecret: string
}

export type OAuthTransaction = {
  formatVersion: '1.0'
  state: string
  nonce: string
  codeVerifier: string
  redirectUri: string
  returnTo: string
  deviceKey: string
  createdAt: string
  expiresAt: string
}

export type GoogleTokenResponse = {
  idToken: string
}

export type GoogleIdTokenVerification = {
  identity: VerifiedGoogleIdentity
  expiresAt: string
}
