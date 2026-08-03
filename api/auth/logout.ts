import { handleAuthLogout } from '../../src/server/serverApiEngine.js'
import { getServerApiDependencies } from '../../src/server/serverRuntime.js'

export { handleAuthLogout }

export default {
  fetch(request: Request) {
    return handleAuthLogout(
      request,
      getServerApiDependencies(process.env) ??
        undefined,
    )
  },
}
