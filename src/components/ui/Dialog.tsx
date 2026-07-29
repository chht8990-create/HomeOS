import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'

export type DialogProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  description?: string
  footer?: ReactNode
  className?: string
  placement?: 'center' | 'bottom'
}

function Dialog({
  open,
  title,
  children,
  onClose,
  description,
  footer,
  className = '',
  placement = 'center',
}: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const dragStartYRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  const panelClasses = [
    'ui-dialog',
    placement === 'bottom'
      ? 'ui-dialog--bottom'
      : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  function handleBackdropClick(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  function resetDragPosition() {
    dragStartYRef.current = null

    if (panelRef.current) {
      panelRef.current.style.removeProperty(
        'transform',
      )
      panelRef.current.style.removeProperty(
        'transition',
      )
    }
  }

  function handleDragStart(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (placement !== 'bottom') {
      return
    }

    dragStartYRef.current = event.clientY
    event.currentTarget.setPointerCapture(
      event.pointerId,
    )
  }

  function handleMouseDragStart(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (placement === 'bottom') {
      dragStartYRef.current = event.clientY
    }
  }

  function handleDragMove(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (
      dragStartYRef.current === null ||
      !panelRef.current
    ) {
      return
    }

    const distance = Math.max(
      0,
      event.clientY - dragStartYRef.current,
    )

    panelRef.current.style.transition = 'none'
    panelRef.current.style.transform =
      `translateY(${distance}px)`
  }

  function handleDragEnd(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (dragStartYRef.current === null) {
      return
    }

    const distance =
      event.clientY - dragStartYRef.current

    resetDragPosition()

    if (distance >= 72) {
      onClose()
    }
  }

  function handleMouseDragMove(
    event: MouseEvent<HTMLElement>,
  ) {
    if (
      dragStartYRef.current === null ||
      !panelRef.current
    ) {
      return
    }

    const distance = Math.max(
      0,
      event.clientY - dragStartYRef.current,
    )

    panelRef.current.style.transition = 'none'
    panelRef.current.style.transform =
      `translateY(${distance}px)`
  }

  function handleMouseDragEnd(
    event: MouseEvent<HTMLElement>,
  ) {
    if (dragStartYRef.current === null) {
      return
    }

    const distance =
      event.clientY - dragStartYRef.current

    resetDragPosition()

    if (distance >= 72) {
      onClose()
    }
  }

  return (
    <div
      className={`ui-dialog-backdrop ui-dialog-backdrop--${placement}`}
      onMouseDown={handleBackdropClick}
    >
      <section
        ref={panelRef}
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          description ? descriptionId : undefined
        }
        onMouseMove={handleMouseDragMove}
        onMouseUp={handleMouseDragEnd}
      >
        {placement === 'bottom' ? (
          <div
            className="ui-dialog__drag-area"
            onPointerDown={handleDragStart}
            onMouseDown={handleMouseDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={resetDragPosition}
            aria-hidden="true"
          >
            <span className="ui-dialog__drag-handle" />
          </div>
        ) : null}

        <header className="ui-dialog__header">
          <div>
            <h2
              id={titleId}
              className="ui-dialog__title"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="ui-dialog__description"
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="ui-dialog__close"
            onClick={onClose}
            aria-label="대화상자 닫기"
          >
            닫기
          </button>
        </header>

        <div className="ui-dialog__body">
          {children}
        </div>

        {footer ? (
          <footer className="ui-dialog__footer">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  )
}

export default Dialog
