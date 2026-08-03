import { handleAccountSync } from '../../src/server/serverApiEngine.js'
import { getServerApiDependencies } from '../../src/server/serverRuntime.js'

export { handleAccountSync }

export default {
  fetch(request: Request) {
    return handleAccountSync(
      request,
      getServerApiDependencies(process.env) ??
        undefined,
    )
  },
}
