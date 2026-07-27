import type { ProgressHTMLAttributes } from 'react'

type ProgressProps =
  ProgressHTMLAttributes<HTMLProgressElement> & {
    label: string
    value: number
    max?: number
    showValue?: boolean
  }

function Progress({
  label,
  value,
  max = 100,
  showValue = true,
  className = '',
  ...progressProps
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100
  const percentage = Math.round(
    Math.min(Math.max(value / safeMax, 0), 1) * 100,
  )
  const classes = ['ui-progress', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <div className="ui-progress__label">
        <span>{label}</span>
        {showValue ? (
          <strong className="ui-number">
            {percentage}%
          </strong>
        ) : null}
      </div>

      <progress
        {...progressProps}
        className="ui-progress__bar"
        value={value}
        max={safeMax}
        aria-label={label}
      />
    </div>
  )
}

export default Progress
