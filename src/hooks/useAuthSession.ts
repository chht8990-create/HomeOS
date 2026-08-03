import {
  useEffect,
  useState,
} from 'react'
import {
  logoutAuthSession,
  restoreAuthSession,
  startGoogleLogin,
} from '../services/authClient'
import {
  createAnonymousAuthSession,
} from '../services/authEngine'
import type {
  AuthSession,
  AuthState,
} from '../types/auth'

const initialState: AuthState = {
  phase: 'loading',
  session: createAnonymousAuthSession(),
}

function useAuthSession() {
  const [state, setState] =
    useState<AuthState>(initialState)

  useEffect(() => {
    let active = true

    void restoreAuthSession({
      storage: window.localStorage,
    }).then((session) => {
      if (active) {
        setState({
          phase: 'ready',
          session,
        })
      }
    })

    return () => {
      active = false
    }
  }, [])

  async function logout() {
    try {
      const session = await logoutAuthSession(
        fetch,
        {
          storage: window.localStorage,
          ...(state.session.status === 'authenticated'
            ? { userId: state.session.user.id }
            : {}),
        },
      )
      setState({
        phase: 'ready',
        session,
      })
    } catch {
      setState((current) => ({
        ...current,
        phase: 'error',
        errorCode: 'LOGOUT_FAILED',
      }))
    }
  }

  return {
    ...state,
    login() {
      startGoogleLogin(window.location.pathname)
    },
    logout,
    setSession(session: AuthSession) {
      setState({
        phase: 'ready',
        session,
      })
    },
  }
}

export default useAuthSession
