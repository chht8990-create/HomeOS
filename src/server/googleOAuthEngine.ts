import {
  createPkceCodeChallenge,
} from './oauthStateEngine.js'
import type {
  GoogleOAuthConfig,
  GoogleOAuthEnvironment,
  GoogleTokenResponse,
  OAuthTransaction,
} from '../types/googleOAuth'

const GOOGLE_AUTHORIZATION_URL =
  'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL =
  'https://oauth2.googleapis.com/token'
const GOOGLE_TOKEN_TIMEOUT_MS = 10_000

function readRequired(
  value: string | undefined,
) {
  const normalized = value?.trim()
  return normalized || null
}

export function parseGoogleOAuthConfig(
  environment: GoogleOAuthEnvironment,
): GoogleOAuthConfig | null {
  const clientId = readRequired(
    environment.GOOGLE_OAUTH_CLIENT_ID,
  )
  const clientSecret = readRequired(
    environment.GOOGLE_OAUTH_CLIENT_SECRET,
  )
  const redirectUri = readRequired(
    environment.GOOGLE_OAUTH_REDIRECT_URI,
  )
  const cookieSecret = readRequired(
    environment.AUTH_COOKIE_SECRET,
  )

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !cookieSecret ||
    cookieSecret.length < 32
  ) {
    return null
  }

  try {
    const url = new URL(redirectUri)

    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash
    ) {
      return null
    }

    return {
      clientId,
      clientSecret,
      redirectUri: url.toString(),
      cookieSecret,
    }
  } catch {
    return null
  }
}

export async function createGoogleAuthorizationUrl(
  config: GoogleOAuthConfig,
  transaction: OAuthTransaction,
) {
  if (transaction.redirectUri !== config.redirectUri) {
    throw new Error('REDIRECT_URI_MISMATCH')
  }

  const url = new URL(GOOGLE_AUTHORIZATION_URL)

  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set(
    'redirect_uri',
    config.redirectUri,
  )
  url.searchParams.set('response_type', 'code')
  url.searchParams.set(
    'scope',
    'openid email profile',
  )
  url.searchParams.set('state', transaction.state)
  url.searchParams.set('nonce', transaction.nonce)
  url.searchParams.set(
    'code_challenge',
    await createPkceCodeChallenge(
      transaction.codeVerifier,
    ),
  )
  url.searchParams.set(
    'code_challenge_method',
    'S256',
  )
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')

  return url.toString()
}

export async function exchangeGoogleAuthorizationCode(
  input: {
    code: string
    transaction: OAuthTransaction
    config: GoogleOAuthConfig
    fetcher?: typeof fetch
  },
): Promise<GoogleTokenResponse> {
  if (
    input.transaction.redirectUri !==
    input.config.redirectUri
  ) {
    throw new Error('REDIRECT_URI_MISMATCH')
  }

  const response = await (
    input.fetcher ?? fetch
  )(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':
        'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      redirect_uri: input.config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier:
        input.transaction.codeVerifier,
    }),
    signal: AbortSignal.timeout(
      GOOGLE_TOKEN_TIMEOUT_MS,
    ),
  })

  if (!response.ok) {
    throw new Error('GOOGLE_CODE_EXCHANGE_FAILED')
  }

  const payload = (await response.json()) as unknown

  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload) ||
    typeof (
      payload as Record<string, unknown>
    ).id_token !== 'string'
  ) {
    throw new Error(
      'GOOGLE_TOKEN_RESPONSE_INVALID',
    )
  }

  return {
    idToken: (
      payload as Record<string, string>
    ).id_token,
  }
}
