import { handleEntitlement } from '../src/server/serverApiEngine.js'
import { getServerApiDependencies } from '../src/server/serverRuntime.js'

export { handleEntitlement }

export default {
  fetch(request: Request) {
    return handleEntitlement(
      request,
      getServerApiDependencies(process.env) ??
        undefined,
    )
  },
}
