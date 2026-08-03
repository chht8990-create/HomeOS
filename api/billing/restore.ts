import { handleBillingRestore } from '../../src/server/billingApiEngine.js'
import { getBusinessRepository } from '../../src/server/businessRuntime.js'
import { getServerApiDependencies } from '../../src/server/serverRuntime.js'

export { handleBillingRestore }

export default {
  fetch(request: Request) {
    const identity = getServerApiDependencies(process.env)
    const business = getBusinessRepository(process.env)

    return handleBillingRestore(
      request,
      identity && business
        ? {
            identity,
            business,
            environment: process.env,
          }
        : undefined,
    )
  },
}
