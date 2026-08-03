import { normalizeAuthReturnTo } from '../services/authEngine.js'
import {
  exchangeGoogleAuthorizationCode,
  createGoogleAuthorizationUrl,
  parseGoogleOAuthConfig,
} from './googleOAuthEngine.js'
import { verifyGoogleIdToken } from './googleIdTokenEngine.js'
import {
  DEVICE_COOKIE_NAME,
  OAUTH_TRANSACTION_COOKIE_NAME,
  constantTimeEqual,
  createDeviceCookie,
  createExpiredOAuthTransactionCookie,
  createOAuthTransaction,
  createOAuthTransactionCookie,
  openOAuthTransaction,
  readCookie,
  sealOAuthTransaction,
} from './oauthStateEngine.js'
import {
  establishVerifiedGoogleSession,
  type ServerApiDependencies,
} from './serverApiEngine.js'
import { createSessionCookie } from './sessionEngine.js'
import type { GoogleOAuthEnvironment } from '../types/googleOAuth'

type GoogleAuthApiOptions = {
  fetcher?: typeof fetch
  now?: () => Date
}

function jsonResponse(
  body: unknown,
  status: number,
) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

function redirectResponse(
  location: string,
  cookies: string[],
) {
  const headers = new Headers({
    Location: location,
    'Cache-Control': 'no-store',
  })

  cookies.forEach((cookie) => {
    headers.append('Set-Cookie', cookie)
  })

  return new Response(null, {
    status: 302,
    headers,
  })
}

function authFailureRedirect(
  returnTo: string,
  code: string,
) {
  const url = new URL(
    normalizeAuthReturnTo(returnTo),
    'https://today-table.invalid',
  )
  url.searchParams.set('authError', code)

  return `${url.pathname}${url.search}`
}

function isValidDeviceKey(value: string | null) {
  return Boolean(
    value &&
      value.length >= 32 &&
      value.length <= 200 &&
      /^[A-Za-z0-9_-]+$/.test(value),
  )
}

export async function handleGoogleAuthRoute(
  request: Request,
  environment: GoogleOAuthEnvironment,
  dependencies: ServerApiDependencies | null,
  options: GoogleAuthApiOptions = {},
) {
  if (request.method !== 'GET') {
    return jsonResponse(
      {
        code: 'METHOD_NOT_ALLOWED',
        message: 'GET 요청만 지원합니다.',
      },
      405,
    )
  }

  const config = parseGoogleOAuthConfig(
    environment,
  )

  if (!config || !dependencies) {
    return jsonResponse(
      {
        code: 'AUTH_NOT_CONFIGURED',
        message:
          'Google 로그인 설정을 준비하고 있습니다.',
      },
      503,
    )
  }

  const requestUrl = new URL(request.url)
  const isCallback =
    requestUrl.searchParams.has('code') ||
    requestUrl.searchParams.has('error') ||
    requestUrl.searchParams.has('state')
  const now = options.now?.() ?? new Date()

  if (!isCallback) {
    const returnTo = normalizeAuthReturnTo(
      requestUrl.searchParams.get('returnTo') ??
        undefined,
    )
    const currentDeviceKey = readCookie(
      request.headers.get('cookie'),
      DEVICE_COOKIE_NAME,
    )
    const transaction = createOAuthTransaction(
      {
        redirectUri: config.redirectUri,
        returnTo,
        ...(isValidDeviceKey(currentDeviceKey)
          ? { deviceKey: currentDeviceKey! }
          : {}),
      },
      now,
    )
    const sealed = await sealOAuthTransaction(
      transaction,
      config.cookieSecret,
    )
    const authorizationUrl =
      await createGoogleAuthorizationUrl(
        config,
        transaction,
      )

    return redirectResponse(authorizationUrl, [
      createOAuthTransactionCookie(sealed),
      ...(isValidDeviceKey(currentDeviceKey)
        ? []
        : [
            createDeviceCookie(
              transaction.deviceKey,
            ),
          ]),
    ])
  }

  const sealedTransaction = readCookie(
    request.headers.get('cookie'),
    OAUTH_TRANSACTION_COOKIE_NAME,
  )
  const transaction = sealedTransaction
    ? await openOAuthTransaction(
        sealedTransaction,
        config.cookieSecret,
        now,
      )
    : null
  const state = requestUrl.searchParams.get('state')

  if (
    !transaction ||
    !state ||
    !constantTimeEqual(state, transaction.state) ||
    transaction.redirectUri !== config.redirectUri
  ) {
    return redirectResponse(
      authFailureRedirect('/', 'state_invalid'),
      [createExpiredOAuthTransactionCookie()],
    )
  }

  if (
    requestUrl.searchParams.get('iss') &&
    requestUrl.searchParams.get('iss') !==
      'https://accounts.google.com'
  ) {
    return redirectResponse(
      authFailureRedirect(
        transaction.returnTo,
        'issuer_invalid',
      ),
      [createExpiredOAuthTransactionCookie()],
    )
  }

  if (requestUrl.searchParams.has('error')) {
    return redirectResponse(
      authFailureRedirect(
        transaction.returnTo,
        'access_denied',
      ),
      [createExpiredOAuthTransactionCookie()],
    )
  }

  const code = requestUrl.searchParams.get('code')

  if (!code || code.length > 4_096) {
    return redirectResponse(
      authFailureRedirect(
        transaction.returnTo,
        'code_invalid',
      ),
      [createExpiredOAuthTransactionCookie()],
    )
  }

  try {
    const token =
      await exchangeGoogleAuthorizationCode({
        code,
        transaction,
        config,
        ...(options.fetcher
          ? { fetcher: options.fetcher }
          : {}),
      })
    const verified = await verifyGoogleIdToken(
      token.idToken,
      {
        clientId: config.clientId,
        nonce: transaction.nonce,
        now,
        ...(options.fetcher
          ? { fetcher: options.fetcher }
          : {}),
      },
    )
    const established =
      await establishVerifiedGoogleSession(
        {
          identity: verified.identity,
          deviceKey: transaction.deviceKey,
        },
        dependencies,
      )

    return redirectResponse(
      transaction.returnTo,
      [
        createSessionCookie(established.token),
        createExpiredOAuthTransactionCookie(),
        createDeviceCookie(transaction.deviceKey),
      ],
    )
  } catch {
    return redirectResponse(
      authFailureRedirect(
        transaction.returnTo,
        'authentication_failed',
      ),
      [createExpiredOAuthTransactionCookie()],
    )
  }
}
