import type { HTMLAttributes, ReactNode } from 'react'

type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode
  tone?: BadgeTone
}

function Badge({
  children,
  tone = 'neutral',
  className = '',
  ...badgeProps
}: BadgeProps) {
  const classes = [
    'ui-badge',
    `ui-badge--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} {...badgeProps}>
      {children}
    </span>
  )
}

export default Badge
