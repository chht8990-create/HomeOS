import {
  useEffect,
  useId,
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
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className={`ui-dialog-backdrop ui-dialog-backdrop--${placement}`}
      onMouseDown={handleBackdropClick}
    >
      <section
        className={panelClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          description ? descriptionId : undefined
        }
      >
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
