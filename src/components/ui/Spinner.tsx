import type { HTMLAttributes } from 'react'

type SpinnerProps = HTMLAttributes<HTMLDivElement> & {
  label?: string
}

function Spinner({
  label = '불러오는 중',
  className = '',
  ...spinnerProps
}: SpinnerProps) {
  const classes = ['ui-spinner', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      {...spinnerProps}
      className={classes}
      role="status"
      aria-label={label}
    >
      <span className="ui-spinner__ring" aria-hidden="true" />
      <span className="ui-spinner__label">{label}</span>
    </div>
  )
}

export default Spinner
