import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme.css'
import './components/ui/ui.css'
import App from './App.tsx'
import { initializeAiAccessUsage } from './services/aiAccessStorage'
import {
  resetAuthSessionCache,
  restoreAuthSession,
} from './services/authClient'
import { startAccountSyncScheduler } from './services/accountSyncScheduler'
import { persistCurrentAccountStorage } from './services/accountStorageNamespace'

startAccountSyncScheduler()

window.addEventListener('online', () => {
  resetAuthSessionCache()
  void restoreAuthSession({
    storage: window.localStorage,
    reloadOnSyncChange: true,
  })
})

async function bootstrap() {
  const session = await restoreAuthSession({
    storage: window.localStorage,
    reloadOnSyncChange: true,
  })
  initializeAiAccessUsage(window.localStorage)
  if (session.status === 'authenticated') {
    persistCurrentAccountStorage(
      window.localStorage,
      session.user.id,
    )
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()

if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator
) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      .catch(() => undefined)
  })
}
