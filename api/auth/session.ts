import { handleAuthSession } from '../../src/server/serverApiEngine.js'
import { getServerApiDependencies } from '../../src/server/serverRuntime.js'

export { handleAuthSession }

export default {
  fetch(request: Request) {
    return handleAuthSession(
      request,
      getServerApiDependencies(process.env) ??
        undefined,
    )
  },
}
