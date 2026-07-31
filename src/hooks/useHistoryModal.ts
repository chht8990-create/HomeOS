import { useEffect, useRef, useState } from 'react'

const HISTORY_MODAL_KEY = '__todayTableModal'
export const HISTORY_MODAL_CHANGE_EVENT =
  'today-table:history-modal-change'
const activeHistoryModals = new Set<string>()

export function hasActiveHistoryModal() {
  return activeHistoryModals.size > 0
}

function publishHistoryModalChange() {
  window.dispatchEvent(
    new Event(HISTORY_MODAL_CHANGE_EVENT),
  )
}

export function isTemporaryModalHistoryState(
  state: unknown,
  modalName: string,
) {
  return (
    typeof state === 'object' &&
    state !== null &&
    HISTORY_MODAL_KEY in state &&
    (state as Record<string, unknown>)[
      HISTORY_MODAL_KEY
    ] === modalName
  )
}

export function createTemporaryModalHistoryState(
  state: unknown,
  modalName: string,
) {
  const currentState =
    typeof state === 'object' && state !== null
      ? state
      : {}

  return {
    ...currentState,
    [HISTORY_MODAL_KEY]: modalName,
  }
}

function useHistoryModal<T>(modalName: string) {
  const [value, setValue] = useState<T | null>(null)
  const valueRef = useRef<T | null>(null)

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      if (
        valueRef.current !== null &&
        !isTemporaryModalHistoryState(
          event.state,
          modalName,
        )
      ) {
        activeHistoryModals.delete(modalName)
        publishHistoryModalChange()
        valueRef.current = null
        setValue(null)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      activeHistoryModals.delete(modalName)
      window.removeEventListener(
        'popstate',
        handlePopState,
      )
    }
  }, [modalName])

  function openModal(nextValue: T) {
    activeHistoryModals.add(modalName)
    publishHistoryModalChange()
    valueRef.current = nextValue
    setValue(nextValue)

    if (
      isTemporaryModalHistoryState(
        window.history.state,
        modalName,
      )
    ) {
      return
    }

    window.history.pushState(
      createTemporaryModalHistoryState(
        window.history.state,
        modalName,
      ),
      '',
      window.location.href,
    )
  }

  function closeModal() {
    if (
      isTemporaryModalHistoryState(
        window.history.state,
        modalName,
      )
    ) {
      window.history.back()
      return
    }

    valueRef.current = null
    activeHistoryModals.delete(modalName)
    publishHistoryModalChange()
    setValue(null)
  }

  function closeModalAndThen(onClosed: () => void) {
    if (
      isTemporaryModalHistoryState(
        window.history.state,
        modalName,
      )
    ) {
      window.addEventListener(
        'popstate',
        onClosed,
        { once: true },
      )
      window.history.back()
      return
    }

    valueRef.current = null
    activeHistoryModals.delete(modalName)
    publishHistoryModalChange()
    setValue(null)
    onClosed()
  }

  return {
    value,
    isOpen: value !== null,
    openModal,
    closeModal,
    closeModalAndThen,
  }
}

export default useHistoryModal
