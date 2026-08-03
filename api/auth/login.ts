import { handleGoogleAuthRoute } from '../../src/server/googleAuthApiEngine.js'
import { getServerApiDependencies } from '../../src/server/serverRuntime.js'

export { handleGoogleAuthRoute }

export default {
  fetch(request: Request) {
    return handleGoogleAuthRoute(
      request,
      process.env,
      getServerApiDependencies(process.env),
    )
  },
}
