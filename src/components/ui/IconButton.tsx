import type { ComponentProps, ReactNode } from 'react'
import Button from './Button'

type IconButtonProps = Omit<
  ComponentProps<typeof Button>,
  'aria-label' | 'children'
> & {
  'aria-label': string
  children: ReactNode
}

function IconButton({
  children,
  className = '',
  ...buttonProps
}: IconButtonProps) {
  const classes = ['ui-icon-button', className]
    .filter(Boolean)
    .join(' ')

  return (
    <Button className={classes} {...buttonProps}>
      {children}
    </Button>
  )
}

export default IconButton
