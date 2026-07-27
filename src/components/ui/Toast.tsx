import type { HTMLAttributes, ReactNode } from 'react'

type ToastTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'

type ToastProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'title'
> & {
  children: ReactNode
  title?: ReactNode
  tone?: ToastTone
  onDismiss?: () => void
}

function Toast({
  children,
  title,
  tone = 'neutral',
  onDismiss,
  className = '',
  ...toastProps
}: ToastProps) {
  const isAlert =
    tone === 'warning' || tone === 'danger'
  const classes = [
    'ui-toast',
    `ui-toast--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      {...toastProps}
    >
      <div className="ui-toast__content">
        {title ? (
          <strong className="ui-toast__title">
            {title}
          </strong>
        ) : null}
        <div>{children}</div>
      </div>

      {onDismiss ? (
        <button
          type="button"
          className="ui-toast__dismiss"
          onClick={onDismiss}
          aria-label="알림 닫기"
        >
          닫기
        </button>
      ) : null}
    </div>
  )
}

export default Toast
