import {
  defineConfig,
  loadEnv,
  type Plugin,
} from 'vite'
import react from '@vitejs/plugin-react'
import {
  handleAiRecipeRecommendation,
  type AiServerEnvironment,
} from './api/ai/recipe-recommendation.ts'

function createAiApiDevPlugin(
  environment: AiServerEnvironment,
): Plugin {
  return {
    name: 'homeos-ai-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(
        '/api/ai/recipe-recommendation',
        async (request, response) => {
          try {
            const chunks: Uint8Array[] = []

            for await (const chunk of request) {
              chunks.push(
                typeof chunk === 'string'
                  ? Buffer.from(chunk)
                  : chunk,
              )
            }

            const requestHeaders = new Headers()

            for (const [key, value] of Object.entries(
              request.headers,
            )) {
              if (Array.isArray(value)) {
                requestHeaders.set(key, value.join(', '))
              } else if (value !== undefined) {
                requestHeaders.set(key, value)
              }
            }

            const body = Buffer.concat(chunks)
            const apiRequest = new Request(
              'http://localhost/api/ai/recipe-recommendation',
              {
                method: request.method,
                headers: requestHeaders,
                body:
                  request.method === 'GET' ||
                  request.method === 'HEAD'
                    ? undefined
                    : body,
              },
            )
            const apiResponse =
              await handleAiRecipeRecommendation(
                apiRequest,
                environment,
              )

            response.statusCode = apiResponse.status
            apiResponse.headers.forEach((value, key) => {
              response.setHeader(key, value)
            })
            response.end(
              Buffer.from(
                await apiResponse.arrayBuffer(),
              ),
            )
          } catch {
            response.statusCode = 500
            response.setHeader(
              'Content-Type',
              'application/json; charset=utf-8',
            )
            response.end(
              JSON.stringify({
                code: 'AI_DEV_SERVER_ERROR',
                message:
                  '로컬 AI 서버를 실행하지 못했어요.',
              }),
            )
          }
        },
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      createAiApiDevPlugin({
        OPENAI_API_KEY:
          process.env.OPENAI_API_KEY ??
          environment.OPENAI_API_KEY,
        OPENAI_MODEL:
          process.env.OPENAI_MODEL ??
          environment.OPENAI_MODEL,
        HOMEOS_AI_MOCK:
          process.env.HOMEOS_AI_MOCK ??
          environment.HOMEOS_AI_MOCK,
        NODE_ENV:
          process.env.NODE_ENV ??
          (mode === 'production'
            ? 'production'
            : 'development'),
      }),
    ],
  }
})
