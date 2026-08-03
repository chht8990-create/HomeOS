import { handleBillingVerify } from '../../src/server/billingApiEngine.js'
import { getBusinessRepository } from '../../src/server/businessRuntime.js'
import { getServerApiDependencies } from '../../src/server/serverRuntime.js'

export { handleBillingVerify }

export default {
  fetch(request: Request) {
    const identity = getServerApiDependencies(process.env)
    const business = getBusinessRepository(process.env)

    return handleBillingVerify(
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
