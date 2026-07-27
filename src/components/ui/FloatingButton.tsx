import type { ComponentProps, ReactNode } from 'react'
import Button from './Button'

type FloatingButtonProps = ComponentProps<typeof Button> & {
  icon?: ReactNode
}

function FloatingButton({
  children,
  icon,
  className = '',
  ...buttonProps
}: FloatingButtonProps) {
  const classes = ['ui-floating-button', className]
    .filter(Boolean)
    .join(' ')

  return (
    <Button className={classes} {...buttonProps}>
      {icon ? (
        <span
          className="ui-floating-button__icon"
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      {children}
    </Button>
  )
}

export default FloatingButton
