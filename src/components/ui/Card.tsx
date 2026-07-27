import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

function Card({ children, className = '' }: CardProps) {
  const cardClassName = ['ui-card', className].filter(Boolean).join(' ')

  return <section className={cardClassName}>{children}</section>
}

export default Card