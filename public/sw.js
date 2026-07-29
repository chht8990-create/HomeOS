const RELEASE_VERSION = '1.0.1'
const CACHE_PREFIX = 'today-table'
const DEPLOYMENT_SCOPE =
  self.location.hostname === 'home-os-one.vercel.app'
    ? 'production'
    : `preview-${self.location.hostname}`
const CACHE_NAMESPACE = `${CACHE_PREFIX}-${DEPLOYMENT_SCOPE}-v${RELEASE_VERSION}`
const APP_SHELL_CACHE = `${CACHE_NAMESPACE}-shell`
const STATIC_CACHE = `${CACHE_NAMESPACE}-static`
const CURRENT_CACHES = new Set([
  APP_SHELL_CACHE,
  STATIC_CACHE,
])
const APP_SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/brand/favicon-32.png',
  '/brand/apple-touch-icon.png',
  '/brand/today-table-icon-192.png',
  '/brand/today-table-icon-512.png',
  '/brand/today-table-icon-maskable-512.png',
]

function isSameOriginGet(request) {
  return (
    request.method === 'GET' &&
    new URL(request.url).origin === self.location.origin
  )
}

function isApiRequest(request) {
  return new URL(request.url).pathname.startsWith('/api/')
}

function isStaticAsset(request) {
  const url = new URL(request.url)

  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/icons.svg' ||
    url.pathname === '/manifest.webmanifest'
  )
}

function isCacheableResponse(response) {
  return (
    response.ok &&
    !response.redirected &&
    response.type === 'basic' &&
    !response.headers
      .get('Cache-Control')
      ?.toLowerCase()
      .includes('no-store')
  )
}

async function isCacheableAppDocument(response) {
  if (
    !isCacheableResponse(response) ||
    !response.headers
      .get('Content-Type')
      ?.toLowerCase()
      .includes('text/html')
  ) {
    return false
  }

  const body = await response.clone().text()

  return (
    body.includes('<div id="root"></div>') &&
    body.includes('/assets/')
  )
}

async function cacheBuiltAssetsFromDocument(response) {
  const body = await response.clone().text()
  const assetUrls = [
    ...body.matchAll(
      /(?:src|href)="(\/assets\/[^"]+)"/g,
    ),
  ].map((match) => match[1])
  const cache = await caches.open(STATIC_CACHE)

  await Promise.all(
    [...new Set(assetUrls)].map(async (url) => {
      try {
        const request = new Request(
          new URL(url, self.location.origin),
          {
            cache: 'reload',
          },
        )
        const assetResponse = await fetch(request)

        if (isCacheableResponse(assetResponse)) {
          await cache.put(request, assetResponse)
        }
      } catch {
        // Runtime caching can fill an unavailable built asset later.
      }
    }),
  )
}

async function cacheAppShellAsset(url) {
  try {
    const request = new Request(
      new URL(url, self.location.origin),
      {
        cache: 'reload',
      },
    )
    const response = await fetch(request)
    const isDocument = url === '/'
    const canCache = isDocument
      ? await isCacheableAppDocument(response)
      : isCacheableResponse(response)

    if (canCache) {
      const cache = await caches.open(APP_SHELL_CACHE)
      await cache.put(request, response.clone())

      if (isDocument) {
        await cacheBuiltAssetsFromDocument(response)
      }
    }
  } catch {
    // A later online navigation can populate any unavailable shell asset.
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)

    if (await isCacheableAppDocument(response)) {
      const cache = await caches.open(APP_SHELL_CACHE)
      await cache.put('/', response.clone())
      await cacheBuiltAssetsFromDocument(response)
    }

    return response
  } catch {
    const cachedShell = await caches.match('/')

    return (
      cachedShell ??
      new Response('오프라인에서 앱을 준비하지 못했어요.', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    )
  }
}

async function updateStaticAsset(request) {
  const response = await fetch(request)

  if (isCacheableResponse(response)) {
    const cache = await caches.open(STATIC_CACHE)
    await cache.put(request, response.clone())
  }

  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all(
      APP_SHELL_URLS.map((url) =>
        cacheAppShellAsset(url),
      ),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()

      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith(
                `${CACHE_PREFIX}-`,
              ) && !CURRENT_CACHES.has(cacheName),
          )
          .map((cacheName) => caches.delete(cacheName)),
      )

      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (
    !isSameOriginGet(request) ||
    isApiRequest(request)
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (!isStaticAsset(request)) {
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      const update = updateStaticAsset(request)

      if (cached) {
        event.waitUntil(update.catch(() => undefined))
        return cached
      }

      try {
        return await update
      } catch {
        return Response.error()
      }
    })(),
  )
})
